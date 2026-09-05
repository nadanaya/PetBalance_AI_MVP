"""비전 AI로 라벨 사진을 읽어 영양성분을 구조화한다 (F-007 강화).

Tesseract OCR 보다 한글 영양성분표·표 레이아웃·조명 편차에 강하다.
`ANTHROPIC_API_KEY`(또는 `ANTHROPIC_AUTH_TOKEN`)가 있을 때만 동작하며,
없으면 available()==False → 호출부가 Tesseract/텍스트 입력으로 폴백한다.

모델은 기본 claude-opus-5. 비용을 낮추려면 VISION_MODEL 환경변수로 바꿀 수 있다
(예: claude-sonnet-5, claude-haiku-4-5).
"""

from __future__ import annotations

import json
import os
import re

_MODEL = os.environ.get("VISION_MODEL", "claude-opus-5")

_PROMPT = """이 이미지는 반려동물 사료·간식·영양제의 포장 라벨이다.
영양성분표(Guaranteed Analysis / 영양성분 / 성분함량)를 읽어 아래 JSON만 출력하라.
설명·코드펜스 없이 JSON 객체 하나만 출력한다.

{
  "product_name": "제품명 (없으면 빈 문자열)",
  "category": "주식" | "간식" | "영양제",
  "serving_basis_g": 숫자,   // 라벨이 '100g 당', '1일 2정(2g)' 처럼 기준으로 삼는 양(g). 알 수 없으면 100
  "nutrients": [
    {"nutrient": "칼슘", "amount_mg": 숫자}   // 표준 한글 성분명, 값은 mg 로 환산 (g→*1000, µg→/1000, % 는 serving_basis_g 기준 질량)
  ],
  "notes": "판독이 애매한 부분"
}

규칙:
- 라벨에 없는 성분·값을 추측해서 채우지 마라. 안 보이면 nutrients 에서 제외한다.
- 최소/최대(min/max)가 함께 있으면 표기값을 그대로, 범위면 중간값을 쓴다.
- 성분명은 칼슘/인/비타민D/비타민A/비타민E/아연/철/구리/망간/요오드/셀레늄/마그네슘/칼륨/나트륨/조단백/조지방/조섬유/오메가3/오메가6 등 표준명으로 정규화한다."""


def available() -> bool:
    return bool(
        os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")
    )


def _extract_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.MULTILINE).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("모델 응답에서 JSON을 찾지 못했습니다.")
    return json.loads(text[start : end + 1])


def read_label(image_bytes: bytes, media_type: str = "image/jpeg") -> dict:
    if not available():
        raise RuntimeError(
            "비전 AI 자격증명이 없습니다. ANTHROPIC_API_KEY 를 설정하거나 "
            "라벨 텍스트를 직접 붙여넣어 주세요."
        )
    import base64

    import anthropic

    client = anthropic.Anthropic()
    b64 = base64.standard_b64encode(image_bytes).decode("ascii")
    try:
        resp = client.messages.create(
            model=_MODEL,
            max_tokens=2000,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64,
                            },
                        },
                        {"type": "text", "text": _PROMPT},
                    ],
                }
            ],
        )
    except Exception as exc:  # pragma: no cover - 네트워크·자격증명 의존
        raise RuntimeError(f"비전 AI 호출 실패: {exc}") from exc

    text = "".join(b.text for b in resp.content if getattr(b, "type", None) == "text")
    try:
        data = _extract_json(text)
    except (ValueError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"라벨 판독 결과를 해석하지 못했습니다: {exc}") from exc

    cats = {"주식", "간식", "영양제"}
    nutrients = []
    for n in data.get("nutrients", []):
        try:
            name = str(n.get("nutrient", "")).strip()
            amt = float(n.get("amount_mg"))
        except (TypeError, ValueError):
            continue
        if name and amt >= 0:
            nutrients.append({"nutrient": name, "amount_mg": amt})
    return {
        "product_name": str(data.get("product_name", "")).strip(),
        "category": data.get("category") if data.get("category") in cats else "영양제",
        "serving_basis_g": float(data.get("serving_basis_g") or 100) or 100,
        "label_complete": False,  # 사람이 확인 화면에서 승격
        "nutrients": nutrients,
        "notes": str(data.get("notes", "")).strip(),
    }
