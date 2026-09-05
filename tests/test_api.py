import unittest

from fastapi.testclient import TestClient

from backend.api import build_app

client = TestClient(build_app())


class HealthAndCatalogTests(unittest.TestCase):
    def test_health(self):
        r = client.get("/health")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "ok")

    def test_catalog_products(self):
        """F-002: 데모 카탈로그가 제품 단위(nutrients 배열)로 반환된다."""
        r = client.get("/api/catalog/products")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertGreaterEqual(len(data), 1)
        self.assertIn("nutrients", data[0])
        self.assertTrue(all("amount_mg" in n for n in data[0]["nutrients"]))

    def test_catalog_standards(self):
        r = client.get("/api/catalog/standards")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(any(row["nutrient"] == "칼슘" for row in r.json()))


class SessionAnalyzeTests(unittest.TestCase):
    def _payload(self):
        return {
            "products": [
                {
                    "product_id": "food_a",
                    "name": "밸런스 성견 사료",
                    "category": "주식",
                    "serving_basis_g": 100,
                    "monthly_price_krw": 42000,
                    "label_complete": True,
                    "nutrients": [
                        {"nutrient": "칼슘", "amount_mg": 1050, "label_complete": True},
                        {"nutrient": "인", "amount_mg": 820, "label_complete": True},
                    ],
                },
                {
                    "product_id": "supp_cal",
                    "name": "튼튼 칼슘",
                    "category": "영양제",
                    "serving_basis_g": 2,
                    "monthly_price_krw": 18000,
                    "label_complete": True,
                    "nutrients": [
                        {"nutrient": "칼슘", "amount_mg": 420, "label_complete": True}
                    ],
                },
            ],
            "selections": [
                {"product_id": "food_a", "daily_amount_g": 120, "active": True},
                {"product_id": "supp_cal", "daily_amount_g": 2, "active": True},
            ],
        }

    def test_session_analyze_sums_and_flags_duplicate(self):
        """F-012/F-013/F-016: 합산·상태·기여도가 함께 나온다."""
        r = client.post("/api/session/analyze", json=self._payload())
        self.assertEqual(r.status_code, 200)
        body = r.json()
        ca = next(x for x in body["summary"] if x["nutrient"] == "칼슘")
        self.assertAlmostEqual(ca["total_mg"], 120 / 100 * 1050 + 2 / 2 * 420, places=3)
        self.assertEqual(ca["status"], "중복 가능")
        shares = {c["product_name"]: c["share_pct"] for c in body["contributions"]["칼슘"]}
        self.assertAlmostEqual(sum(shares.values()), 100.0, places=3)

    def test_session_analyze_rejects_negative(self):
        payload = self._payload()
        payload["selections"][0]["daily_amount_g"] = -5
        r = client.post("/api/session/analyze", json=payload)
        self.assertEqual(r.status_code, 422)  # pydantic ge=0

    def test_inactive_product_excluded(self):
        payload = self._payload()
        payload["selections"][1]["active"] = False
        r = client.post("/api/session/analyze", json=payload)
        ca = next(x for x in r.json()["summary"] if x["nutrient"] == "칼슘")
        self.assertAlmostEqual(ca["total_mg"], 120 / 100 * 1050, places=3)


class OcrEndpointTests(unittest.TestCase):
    def test_ocr_draft_from_text(self):
        """F-006/F-008: 텍스트에서 초안을 만들고 자동 확정하지 않는다."""
        text = "튼튼 칼슘 영양제\n1일 2정(2g) 기준\n칼슘 420mg\n인 160mg\n비타민D 8µg"
        r = client.post("/api/ocr/draft", data={"text": text})
        self.assertEqual(r.status_code, 200)
        draft = r.json()
        self.assertEqual(draft["serving_basis_g"], 2.0)
        self.assertFalse(draft["label_complete"])  # 사람 확인 전
        names = {n["nutrient"] for n in draft["nutrients"]}
        self.assertEqual(names, {"칼슘", "인", "비타민D"})

    def test_ocr_confirm_builds_product(self):
        r = client.post(
            "/api/ocr/confirm",
            json={
                "product_name": "확인된 칼슘",
                "category": "영양제",
                "serving_basis_g": 2,
                "label_complete": True,
                "monthly_price_krw": 15000,
                "nutrients": [
                    {"nutrient": "칼슘", "amount_mg": 420, "label_complete": True}
                ],
            },
        )
        self.assertEqual(r.status_code, 200)
        prod = r.json()
        self.assertEqual(prod["name"], "확인된 칼슘")
        self.assertEqual(prod["nutrients"][0]["nutrient"], "칼슘")

    def test_ocr_draft_empty_is_400(self):
        r = client.post("/api/ocr/draft", data={"text": "   "})
        self.assertEqual(r.status_code, 400)


class SessionSaveRestoreTests(unittest.TestCase):
    def test_save_then_restore_roundtrip(self):
        """F-026: 저장 → 복원 왕복."""
        import tempfile
        from pathlib import Path

        db = str(Path(tempfile.mkdtemp()) / "rt.db")
        from backend.database import init_db

        init_db(Path(db))

        save = client.post(
            "/api/session/save",
            params={"db": db},
            json={
                "profile": {
                    "name": "복원이",
                    "weight_kg": 9.0,
                    "age": 4,
                    "breed": "푸들",
                    "neutered": True,
                },
                "products": [
                    {
                        "product_id": "food_a",
                        "name": "밸런스 성견 사료",
                        "category": "주식",
                        "serving_basis_g": 100,
                        "monthly_price_krw": 42000,
                        "label_complete": True,
                        "nutrients": [
                            {"nutrient": "칼슘", "amount_mg": 1050, "label_complete": True}
                        ],
                    }
                ],
                "selections": [
                    {"product_id": "food_a", "daily_amount_g": 130, "active": True}
                ],
            },
        )
        self.assertEqual(save.status_code, 201)
        pet_id = save.json()["pet_id"]

        got = client.get(f"/api/session/restore/{pet_id}", params={"db": db})
        self.assertEqual(got.status_code, 200)
        body = got.json()
        self.assertEqual(body["profile"]["name"], "복원이")
        self.assertEqual(body["profile"]["breed"], "푸들")
        self.assertEqual(body["selections"][0]["daily_amount_g"], 130)
        self.assertEqual(body["products"][0]["nutrients"][0]["nutrient"], "칼슘")


if __name__ == "__main__":
    unittest.main()
