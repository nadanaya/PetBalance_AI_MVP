"""Public deployment boundaries and two-user persistence regression tests."""

import pytest
from fastapi.testclient import TestClient

from backend import api as server
from backend.database import create_pet, init_db


@pytest.fixture
def public_client(tmp_path, monkeypatch):
    db = tmp_path / "public.db"
    init_db(db)
    monkeypatch.setattr(server, "PUBLIC_SERVER", True)
    monkeypatch.setattr(server, "DEFAULT_DB", db)
    return TestClient(server.build_app())


def register(client, email):
    response = client.post("/api/auth/register", json={
        "email": email, "password": "test-password-123",
    })
    assert response.status_code == 201, response.text
    return {"Authorization": "Bearer " + response.json()["token"]}


def payload(name, amount):
    return {
        "profile": {"name": name, "weight_kg": 8},
        "products": [{
            "product_id": "same-product", "name": name + " food", "category": "주식",
            "serving_basis_g": 100, "monthly_price_krw": 10000,
            "nutrients": [{"nutrient": "칼슘", "amount_mg": amount}],
        }],
        "selections": [{"product_id": "same-product", "daily_amount_g": 100, "active": True}],
    }


def test_public_catalog_and_analysis_remain_available(public_client):
    assert public_client.get("/").status_code == 200
    assert public_client.get("/health").json() == {"status": "ok"}
    assert public_client.get("/api/catalog/products").status_code == 200
    body = payload("guest", 100)
    response = public_client.post("/api/session/analyze", json=body)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("url", [
    "/api/pets", "/api/session/restore/1",
])
def test_anonymous_private_reads_require_login(public_client, url):
    assert public_client.get(url).status_code == 401


def test_anonymous_save_requires_login(public_client):
    assert public_client.post("/api/session/save", json=payload("guest", 100)).status_code == 401


def test_paid_vision_requires_login(public_client):
    result = public_client.post("/api/ocr/vision", files={"file": ("test.jpg", b"image", "image/jpeg")})
    assert result.status_code == 401


@pytest.mark.parametrize("url", [
    "/api/pets?db=", "/api/catalog/products?db=outside.db",
    "/api/catalog/standards?standards_csv=outside.csv",
])
def test_local_file_overrides_are_rejected(public_client, url):
    assert public_client.get(url).status_code == 400


@pytest.mark.parametrize("url", [
    "/api/pets/1", "/api/pets/1/feeding", "/api/products", "/api/products/test",
    "/api/analyze?pet_id=1", "/api/contributions?pet_id=1", "/api/unknown",
])
def test_legacy_routes_and_unknown_api_are_not_public(public_client, url):
    assert public_client.get(url).status_code == 404


def test_users_cannot_read_or_overwrite_each_others_saved_diets(public_client):
    alice = register(public_client, "alice@example.com")
    bob = register(public_client, "bob@example.com")
    local_pet = create_pet(name="local-only", species="dog", weight_kg=8,
                           life_stage="adult", db_path=server.DEFAULT_DB)
    first = public_client.post("/api/session/save", headers=alice, json=payload("Alice", 100))
    assert first.status_code == 201, first.text
    pet_id = first.json()["pet_id"]
    second = public_client.post("/api/session/save", headers=bob, json=payload("Bob", 999))
    assert second.status_code == 201, second.text
    assert public_client.get(f"/api/session/restore/{pet_id}", headers=bob).status_code == 404
    assert public_client.get(f"/api/session/restore/{local_pet}", headers=alice).status_code == 404
    pets = public_client.get("/api/pets", headers=alice).json()
    assert [p["pet_id"] for p in pets] == [pet_id]
    restored = public_client.get(f"/api/session/restore/{pet_id}", headers=alice).json()
    assert restored["products"][0]["nutrients"][0]["amount_mg"] == 100
    assert restored["products"][0]["product_id"] == "same-product"
    assert restored["selections"][0]["product_id"] == "same-product"
    # Saving a new revision must not mutate older snapshots either.
    assert public_client.post("/api/session/save", headers=alice, json=payload("Alice", 222)).status_code == 201
    assert public_client.get(f"/api/session/restore/{pet_id}", headers=alice).json() == restored


def test_static_file_traversal_is_rejected(public_client, tmp_path, monkeypatch):
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("app")
    (tmp_path / "secret.txt").write_text("must-not-leak")
    monkeypatch.setattr(server, "FRONTEND_DIST", dist)
    assert public_client.get("/%2e%2e/secret.txt").status_code == 404
    assert public_client.get("/%2e%2e%5csecret.txt").status_code == 404
    assert public_client.get("/dashboard").text == "app"
