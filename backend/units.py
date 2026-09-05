"""다중 단위 표준화 (F-011).

라벨 표기를 "1회 급여 기준량(g)당 mg" 으로 환산한다. 질량 단위뿐 아니라
%, mg/kg(ppm), IU, IU/kg, mg/정(1회분당) 도 지원한다.

환산에 급여 기준량이나 1회분 개수가 필요한 경우가 있으므로 컨텍스트를 함께 받는다.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# 질량 → mg
_MASS_TO_MG = {
    "mg": 1.0, "㎎": 1.0, "밀리그램": 1.0,
    "g": 1000.0, "그램": 1000.0, "gram": 1000.0,
    "kg": 1_000_000.0, "㎏": 1_000_000.0,
    "µg": 1e-3, "㎍": 1e-3, "ug": 1e-3, "mcg": 1e-3, "마이크로그램": 1e-3,
}

# IU → mg (영양소별). 미지의 영양소는 IU 환산 불가.
_IU_TO_MG = {
    "비타민D": 2.5e-5,   # 1 IU = 0.025 µg cholecalciferol
    "비타민A": 3e-4,      # 1 IU = 0.3 µg retinol
    "비타민E": 6.7e-1,    # 1 IU = 0.667 mg d-alpha-tocopherol
}


@dataclass(frozen=True)
class UnitContext:
    serving_basis_g: float = 100.0   # 라벨 기준량(g)
    servings_per_pack: float = 1.0   # "1정" 등 1회분 개수(mg/정 계열용)


class UnitError(ValueError):
    pass


def to_mg_per_serving(
    value: float, unit: str, nutrient: str, ctx: UnitContext | None = None
) -> float:
    """`value unit` 를 기준량(ctx.serving_basis_g)당 총 mg 으로 환산."""
    ctx = ctx or UnitContext()
    u = unit.strip().lower().rstrip(".")
    u = u.replace("퍼센트", "%").replace("prozent", "%")

    if u in _MASS_TO_MG:
        return value * _MASS_TO_MG[u]

    if u in {"%", "백분율", "percent"}:
        # 기준량의 value% 가 해당 성분의 질량
        return value / 100.0 * ctx.serving_basis_g * 1000.0

    if u in {"mg/kg", "ppm", "㎎/㎏"}:
        # 사료 1kg당 value mg → 기준량 비례
        return value * (ctx.serving_basis_g / 1000.0)

    if u in {"g/kg", "‰", "permille"}:
        return value * (ctx.serving_basis_g / 1000.0) * 1000.0

    if u in {"iu", "i.u", "국제단위"}:
        factor = _IU_TO_MG.get(nutrient)
        if factor is None:
            raise UnitError(f"{nutrient} 은(는) IU→mg 환산 계수가 없습니다.")
        return value * factor

    if u in {"iu/kg", "국제단위/kg"}:
        factor = _IU_TO_MG.get(nutrient)
        if factor is None:
            raise UnitError(f"{nutrient} 은(는) IU/kg→mg 환산 계수가 없습니다.")
        return value * factor * (ctx.serving_basis_g / 1000.0)

    m = re.match(r"(mg|㎎|µg|㎍|mcg|g)\s*/\s*(정|캡슐|알|포|스쿱|회분|tablet|capsule|serving)", u)
    if m:
        base = _MASS_TO_MG[m.group(1)]
        return value * base * ctx.servings_per_pack

    raise UnitError(f"알 수 없는 단위: {unit!r}")


_UNIT_TOKENS = [
    "mg/kg", "iu/kg", "g/kg", "mg/정", "mg/캡슐", "mg/알", "mg/포", "mg/스쿱",
    "㎎", "mg", "µg", "㎍", "mcg", "ug", "kg", "㎏", "g",
    "iu", "국제단위", "%", "ppm", "‰",
]
UNIT_ALTERNATION = "|".join(re.escape(t) for t in _UNIT_TOKENS)


def supported_units() -> list[str]:
    return sorted(set(_MASS_TO_MG) | {"%", "mg/kg", "ppm", "IU", "IU/kg", "mg/정", "g/kg"})
