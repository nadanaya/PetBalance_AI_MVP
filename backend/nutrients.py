"""성분명 정규화 (F-032).

라벨·API 로 들어오는 다양한 표기(Ca / 칼슘 / calcium, Vit D3 / 비타민디 …)를
기준표와 맞는 표준 한글명 하나로 접는다. label_ocr 의 좁은 사전을 대체·확장한다.
"""

from __future__ import annotations

import re

# 표준명 → 별칭 목록. 더 구체적인 별칭을 앞에 둔다.
CANONICAL: dict[str, list[str]] = {
    "칼슘": ["칼슘", "칼 슘", "calcium", "ca"],
    "인": ["인산", "인(p)", "인", "phosphorus", "phosphorous", "p"],
    "칼슘:인 비율": ["칼슘:인", "ca:p", "칼슘 인 비율", "ca/p"],
    "비타민D": [
        "비타민d3", "비타민 d3", "비타민-d3", "비타민d", "비타민 d", "비타민디",
        "vitamin d3", "vitamin d", "vit d3", "vit d", "vit.d", "cholecalciferol",
        "콜레칼시페롤",
    ],
    "비타민A": ["비타민a", "비타민 a", "vitamin a", "vit a", "retinol", "레티놀"],
    "비타민E": ["비타민e", "비타민 e", "vitamin e", "vit e", "tocopherol", "토코페롤"],
    "비타민C": ["비타민c", "비타민 c", "vitamin c", "ascorbic acid", "아스코르브산"],
    "아연": ["아연", "zinc", "zn"],
    "철": ["철분", "철", "iron", "fe"],
    "구리": ["구리", "동", "copper", "cu"],
    "망간": ["망간", "manganese", "mn"],
    "요오드": ["요오드", "아이오딘", "iodine", "i2", "iodide"],
    "셀레늄": ["셀레늄", "셀렌", "selenium", "se"],
    "마그네슘": ["마그네슘", "magnesium", "mg"],
    "칼륨": ["칼륨", "포타슘", "potassium", "k"],
    "나트륨": ["나트륨", "소듐", "sodium", "na", "소금", "염분"],
    "조단백": ["조단백", "조단백질", "단백질", "crude protein", "protein"],
    "조지방": ["조지방", "지방", "crude fat", "fat", "ether extract"],
    "조섬유": ["조섬유", "섬유질", "crude fiber", "fibre", "fiber"],
    "오메가3": ["오메가3", "오메가-3", "omega 3", "omega-3", "n-3", "epa+dha", "epa", "dha"],
    "오메가6": ["오메가6", "오메가-6", "omega 6", "omega-6", "n-6", "리놀레산", "linoleic"],
    "타우린": ["타우린", "taurine"],
    "글루코사민": ["글루코사민", "glucosamine"],
    "콘드로이틴": ["콘드로이틴", "chondroitin"],
}

# 역인덱스: 정규화된 별칭 → 표준명
_ALIAS_TO_CANON: dict[str, str] = {}
for _canon, _aliases in CANONICAL.items():
    _ALIAS_TO_CANON[_canon.lower()] = _canon
    for _a in _aliases:
        _ALIAS_TO_CANON[_a.lower()] = _canon


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def normalize_nutrient_name(name: str) -> str:
    """표준명을 돌려준다. 매칭 실패 시 공백만 정리한 원문을 그대로 돌려준다."""
    key = _norm(name)
    if key in _ALIAS_TO_CANON:
        return _ALIAS_TO_CANON[key]
    # 괄호·단위 꼬리표 제거 후 재시도: "칼슘(Ca)", "아연 as ZnO"
    stripped = re.sub(r"[\(（].*?[\)）]", "", key)
    stripped = re.sub(r"\bas\b.*$", "", stripped).strip()
    if stripped in _ALIAS_TO_CANON:
        return _ALIAS_TO_CANON[stripped]
    for alias, canon in _ALIAS_TO_CANON.items():
        if alias and (alias == stripped or (len(alias) >= 2 and alias in key)):
            return canon
    return (name or "").strip()


def is_known(name: str) -> bool:
    return _norm(name) in _ALIAS_TO_CANON
