"""라벨 사진·텍스트에서 제품 초안을 만든다.

이 모듈은 후보값만 만든다. 확정은 사람이 확인 화면에서 수행하며,
OCR 결과를 자동으로 조합에 반영하지 않는다(안전 범위: "OCR 자동 확정" 제외).
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field

import pandas as pd

from backend.nutrients import CANONICAL, normalize_nutrient_name
from backend.units import UnitContext, UnitError, to_mg_per_serving

# src.nutrition 과 동일한 제품 스키마를 재사용한다.
PRODUCT_ROW_COLUMNS = [
    "product_id",
    "product_name",
    "category",
    "serving_basis_g",
    "nutrient",
    "amount_mg",
    "label_complete",
    "monthly_price_krw",
]

CATEGORIES = ["주식", "간식", "영양제"]

# 라벨 표기 → 기준표 영양소명. 더 구체적인 표기를 앞에 둔다.
_NUTRIENT_SYNONYMS: dict[str, list[str]] = {
    "비타민D": [
        "비타민d3", "비타민 d3", "비타민-d3",
        "비타민d", "비타민 d", "비타민-d",
        "vitamin d3", "vitamin d", "vit d", "vit.d", "vitd",
    ],
    "칼슘": ["칼슘", "calcium", "ca"],
    "인": ["인산", "phosphorus", "인(p)", "인"],
    "아연": ["아연", "zinc", "zn"],
    "철": ["철분", "철", "iron", "fe"],
}

# IU → mg (비타민 D3: 1 IU = 0.025 µg)
_IU_TO_MG = {"비타민D": 2.5e-5}

_UNIT_TO_MG_FACTOR = {
    "mg": 1.0,
    "㎎": 1.0,
    "밀리그램": 1.0,
    "g": 1000.0,
    "그램": 1000.0,
    "㎏": 1_000_000.0,
    "kg": 1_000_000.0,
    "µg": 1e-3,
    "㎍": 1e-3,
    "ug": 1e-3,
    "mcg": 1e-3,
    "마이크로그램": 1e-3,
}

_UNIT_ALTERNATION = "|".join(
    re.escape(u)
    for u in [
        "mg", "㎎", "밀리그램",
        "µg", "㎍", "mcg", "ug", "마이크로그램",
        "iu", "i.u.", "국제단위",
        "kg", "㎏",
        "g", "그램",
    ]
)


@dataclass(frozen=True)
class DraftNutrient:
    nutrient: str
    amount_mg: float
    source_text: str
    source_unit: str


@dataclass
class LabelDraft:
    product_name: str = ""
    category: str = "영양제"
    serving_basis_g: float = 100.0
    nutrients: list[DraftNutrient] = field(default_factory=list)
    unparsed_lines: list[str] = field(default_factory=list)
    label_complete: bool = False  # OCR 초안은 사람이 확인하기 전까지 미완료로 둔다.


# --------------------------------------------------------------------------- #
# 파싱 유틸
# --------------------------------------------------------------------------- #
def normalize_number(token: str) -> float | None:
    """`1,050` `0.018` `1,234.5` 형태를 float 로. 천단위 콤마만 허용."""
    token = token.strip()
    if not re.fullmatch(r"\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?", token):
        return None
    try:
        return float(token.replace(",", ""))
    except ValueError:
        return None


def convert_to_mg(value: float, unit: str, nutrient: str) -> float | None:
    """단위 문자열을 mg 로 환산. 알 수 없는 단위는 None.

    질량/µg/IU 는 기존 표로 처리하고, 그 외(%, mg/kg, IU/kg, mg/정 …)는
    backend.units 로 위임한다(기준량·1회분 컨텍스트 필요 → 기본값 사용).
    """
    key = unit.strip().lower().rstrip(".")
    if key in _UNIT_TO_MG_FACTOR:
        return value * _UNIT_TO_MG_FACTOR[key]
    if key in {"iu", "i.u", "국제단위"}:
        factor = _IU_TO_MG.get(nutrient)
        return value * factor if factor is not None else None
    try:
        return to_mg_per_serving(value, unit, nutrient, UnitContext())
    except UnitError:
        return None


def match_nutrient(text: str) -> str | None:
    """한 조각의 텍스트에서 기준 영양소명을 찾는다."""
    lowered = text.lower()
    for canonical, synonyms in _NUTRIENT_SYNONYMS.items():
        for syn in synonyms:
            if syn.isascii():
                if re.search(rf"(?<![a-z]){re.escape(syn)}(?![a-z])", lowered):
                    return canonical
            elif canonical == "인" and syn == "인":
                if re.search(r"(?<![가-힣])인(?![가-힣])", text):
                    return canonical
            elif syn in lowered:
                return canonical
    # 넓은 동의어 사전(backend.nutrients, F-032)로 재시도 — 구리·셀레늄·비타민E 등.
    cand = normalize_nutrient_name(text)
    if cand in CANONICAL:
        return cand
    return None


_SERVING_PATTERNS = [
    r"(\d[\d.,]*)\s*(?:g|㎎|그램)\s*당",
    r"\d+\s*(?:정|캡슐|캡술|포|스쿱|알|스푼)\s*\(?(\d[\d.,]*)\s*g",
    r"(?:기준량|기준|serving size|serving)\D{0,6}(\d[\d.,]*)\s*g",
    r"per\s*(\d[\d.,]*)\s*g",
    r"\(?(\d[\d.,]*)\s*g\)?\s*(?:기준|당)",
    r"1\s*(?:일|회)\D{0,4}(\d[\d.,]*)\s*g",
]


def _extract_serving_basis(text: str) -> float | None:
    for pattern in _SERVING_PATTERNS:
        m = re.search(pattern, text, flags=re.IGNORECASE)
        if m:
            value = normalize_number(m.group(1))
            if value and value > 0:
                return value
    return None


def _guess_category(text: str) -> str:
    lowered = text.lower()
    if any(k in lowered for k in ["사료", "주식", "건식", "습식", "화식"]):
        return "주식"
    if any(k in lowered for k in ["간식", "트릿", "트리트", "저키", "져키", "츄"]):
        return "간식"
    return "영양제"


def _guess_product_name(lines: list[str]) -> str:
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(r"^[\d\W]+$", stripped):
            continue
        if match_nutrient(stripped) and re.search(r"\d", stripped):
            continue
        if any(k in stripped for k in ["영양성분", "성분표", "guaranteed", "nutrition"]):
            continue
        return stripped[:60]
    return ""


def parse_label_text(text: str) -> LabelDraft:
    """자유 형식 라벨 텍스트에서 제품 초안을 만든다."""
    text = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    lines = [ln.strip() for ln in text.split("\n")]

    draft = LabelDraft()
    draft.product_name = _guess_product_name(lines)
    draft.category = _guess_category(text)
    serving = _extract_serving_basis(text)
    if serving is not None:
        draft.serving_basis_g = serving

    nutrient_re = re.compile(
        rf"([^\n,;/·|]*?)(\d[\d.,]*)\s*({_UNIT_ALTERNATION})\b",
        flags=re.IGNORECASE,
    )

    seen: set[str] = set()
    matched_spans: list[str] = []
    for m in nutrient_re.finditer(text):
        prefix, number_token, unit_token = m.group(1), m.group(2), m.group(3)
        nutrient = match_nutrient(prefix)
        if nutrient is None or nutrient in seen:
            continue
        value = normalize_number(number_token)
        if value is None:
            continue
        amount_mg = convert_to_mg(value, unit_token, nutrient)
        if amount_mg is None or amount_mg < 0:
            continue
        seen.add(nutrient)
        matched_spans.append(m.group(0).strip())
        draft.nutrients.append(
            DraftNutrient(
                nutrient=nutrient,
                amount_mg=round(amount_mg, 6),
                source_text=m.group(0).strip(),
                source_unit=unit_token.lower(),
            )
        )

    for line in lines:
        if not line:
            continue
        if any(span and span in line for span in matched_spans):
            continue
        if re.search(r"\d", line) and (
            re.search(rf"({_UNIT_ALTERNATION})\b", line, flags=re.IGNORECASE)
            or "%" in line
        ):
            draft.unparsed_lines.append(line)

    return draft


def slugify_product_id(name: str) -> str:
    base = re.sub(r"[^0-9a-zA-Z가-힣]+", "_", (name or "").strip()).strip("_").lower()
    base = base[:24] or "label"
    return f"user_{base}_{uuid.uuid4().hex[:4]}"


def draft_to_rows(
    draft: LabelDraft,
    *,
    product_id: str | None = None,
    monthly_price_krw: float | int | None = None,
) -> pd.DataFrame:
    """확인된 초안을 products.csv 와 동일한 형태의 DataFrame 으로 만든다."""
    if not draft.product_name.strip():
        raise ValueError("제품명을 입력해야 합니다.")
    if draft.category not in CATEGORIES:
        raise ValueError(f"분류는 {CATEGORIES} 중 하나여야 합니다.")
    if draft.serving_basis_g <= 0:
        raise ValueError("라벨 기준량(g)은 0보다 커야 합니다.")
    if not draft.nutrients:
        raise ValueError("영양소가 하나도 없습니다.")

    pid = product_id or slugify_product_id(draft.product_name)
    records = []
    for item in draft.nutrients:
        if item.amount_mg < 0:
            raise ValueError(f"{item.nutrient} 함량은 음수가 될 수 없습니다.")
        records.append(
            {
                "product_id": pid,
                "product_name": draft.product_name.strip(),
                "category": draft.category,
                "serving_basis_g": float(draft.serving_basis_g),
                "nutrient": item.nutrient,
                "amount_mg": float(item.amount_mg),
                "label_complete": bool(draft.label_complete),
                "monthly_price_krw": (
                    0 if monthly_price_krw is None else int(monthly_price_krw)
                ),
            }
        )
    return pd.DataFrame.from_records(records, columns=PRODUCT_ROW_COLUMNS)


def extract_text_from_image(data: bytes, lang: str = "kor+eng") -> str:
    """선택 의존성(pytesseract, Pillow)이 있으면 이미지에서 텍스트를 읽는다.

    없으면 RuntimeError 를 던져 호출부가 '텍스트 붙여넣기'로 유도하게 한다.
    """
    try:
        import io

        import pytesseract
        from PIL import Image
    except ImportError as exc:  # pragma: no cover - 환경 의존
        raise RuntimeError(
            "이미지 OCR 라이브러리(pytesseract, Pillow)가 없습니다. "
            "라벨 텍스트를 직접 붙여넣어 주세요."
        ) from exc

    try:
        image = Image.open(io.BytesIO(data))
        text = pytesseract.image_to_string(image, lang=lang)
    except Exception as exc:  # pragma: no cover - 환경 의존
        raise RuntimeError(f"이미지에서 텍스트를 읽지 못했습니다: {exc}") from exc

    if not text.strip():
        raise RuntimeError(
            "이미지에서 글자를 찾지 못했습니다. 더 선명한 사진을 쓰거나 "
            "라벨 텍스트를 직접 붙여넣어 주세요."
        )
    return text
