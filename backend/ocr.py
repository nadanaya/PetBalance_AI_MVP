"""라벨 이미지 OCR (F-007).

pytesseract + Pillow 가 있으면 이미지 → 텍스트를 수행하고, 간단한 전처리
(그레이스케일·대비·이진화)로 인식률을 높인다. 없으면 명확한 안내와 함께
RuntimeError 를 던져 호출부가 '텍스트 붙여넣기'로 유도한다.

이미지 OCR 정확도는 실제 라벨 사진 세트로 별도 측정해야 한다(남은 과제).
텍스트 파싱 정확도는 tests/test_ocr.py 로 회귀 검증한다.
"""

from __future__ import annotations

import io


def available() -> bool:
    try:
        import PIL  # noqa: F401
        import pytesseract  # noqa: F401

        return True
    except Exception:
        return False


def image_to_text(data: bytes, lang: str = "kor+eng") -> str:
    try:
        import pytesseract
        from PIL import Image, ImageFilter, ImageOps
    except ImportError as exc:  # pragma: no cover - 환경 의존
        raise RuntimeError(
            "이미지 OCR 라이브러리(pytesseract, Pillow)가 없습니다. "
            "라벨 텍스트를 직접 붙여넣어 주세요."
        ) from exc

    try:
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img).convert("L")
        # 폭 1600px 로 확대(작은 글자 대비)
        if img.width < 1600:
            ratio = 1600 / img.width
            img = img.resize((1600, int(img.height * ratio)))
        img = ImageOps.autocontrast(img)
        img = img.filter(ImageFilter.SHARPEN)
        img = img.point(lambda p: 255 if p > 160 else 0)  # 이진화
        text = pytesseract.image_to_string(img, lang=lang)
    except Exception as exc:  # pragma: no cover - 환경 의존
        raise RuntimeError(f"이미지에서 텍스트를 읽지 못했습니다: {exc}") from exc

    if not text.strip():
        raise RuntimeError(
            "이미지에서 글자를 찾지 못했습니다. 더 선명한 사진을 쓰거나 "
            "라벨 텍스트를 직접 붙여넣어 주세요."
        )
    return text
