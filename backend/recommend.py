"""대체 제품 추천 (F-019).

현재 조합에서 '기준 초과 가능' 또는 '중복 가능' 신호가 있는 영양소를 줄이기 위해,
그 신호에 크게 기여하는 제품을 같은 카테고리의 카탈로그 대안으로 바꿔봤을 때의
개선 효과를 점수화해 순위를 매긴다. 순수 규칙 기반(블랙박스 없음).
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from backend.nutrition import (
    FeedingSelection,
    calculate_intake,
    product_contributions,
    summarize_intake,
)
from backend.database import products_to_dataframe

_FLAG = {"기준 초과 가능", "중복 가능"}


def _score(summary: pd.DataFrame) -> dict[str, float]:
    """상태별 벌점 합. 낮을수록 좋다."""
    penalty = 0.0
    detail: dict[str, float] = {}
    for r in summary.itertuples():
        over = max(0.0, r.total_mg - r.demo_max_mg) / max(r.demo_max_mg, 1e-9)
        under = max(0.0, r.demo_min_mg - r.total_mg) / max(r.demo_min_mg, 1e-9)
        p = over * 3.0 + under * 1.0
        if r.status == "중복 가능":
            p += 0.5
        if r.status == "정보 부족":
            p += 0.3
        penalty += p
        detail[r.nutrient] = round(p, 4)
    return {"penalty": round(penalty, 4), **detail}


def recommend_swaps(
    products: list[dict[str, Any]],
    selections: list[dict[str, Any]],
    catalog: list[dict[str, Any]],
    standards: pd.DataFrame,
    max_results: int = 5,
) -> dict[str, Any]:
    sel_objs = [
        FeedingSelection(s["product_id"], float(s["daily_amount_g"]), bool(s.get("active", True)))
        for s in selections
    ]
    base_df = products_to_dataframe(products)
    base_intake = calculate_intake(base_df, sel_objs)
    base_summary = summarize_intake(base_intake, standards)
    base_penalty = _score(base_summary)["penalty"]

    flagged = [r.nutrient for r in base_summary.itertuples() if r.status in _FLAG]
    active_ids = {s.product_id for s in sel_objs if s.active}
    by_id = {p["product_id"]: p for p in products}
    cat_by_id = {p["product_id"]: p for p in catalog}

    # 교체 후보: 활성 제품 중 flagged 영양소 기여 상위
    swap_targets: list[tuple[str, float]] = []
    for nutrient in flagged:
        for c in product_contributions(base_intake, nutrient).itertuples():
            pid = next(
                (p["product_id"] for p in products if p["name"] == c.product_name), None
            )
            if pid in active_ids:
                swap_targets.append((pid, c.share_pct))
    seen: set[str] = set()
    ordered_targets = [
        pid for pid, _ in sorted(swap_targets, key=lambda x: -x[1])
        if not (pid in seen or seen.add(pid))
    ]

    results: list[dict[str, Any]] = []
    for target_id in ordered_targets:
        target = by_id.get(target_id) or cat_by_id.get(target_id)
        if not target:
            continue
        for alt in catalog:
            if alt["product_id"] == target_id or alt["category"] != target["category"]:
                continue
            if alt["product_id"] in active_ids:
                continue
            new_products = [p for p in products if p["product_id"] != target_id] + [alt]
            keep_amount = next(
                (s["daily_amount_g"] for s in selections if s["product_id"] == target_id), 1.0
            )
            new_sel = [s for s in selections if s["product_id"] != target_id] + [
                {"product_id": alt["product_id"], "daily_amount_g": keep_amount, "active": True}
            ]
            try:
                new_df = products_to_dataframe(new_products)
                new_summary = summarize_intake(
                    calculate_intake(
                        new_df,
                        [
                            FeedingSelection(s["product_id"], float(s["daily_amount_g"]), bool(s.get("active", True)))
                            for s in new_sel
                        ],
                    ),
                    standards,
                )
            except Exception:
                continue
            new_penalty = _score(new_summary)["penalty"]
            improvement = round(base_penalty - new_penalty, 4)
            if improvement > 0.01:
                results.append(
                    {
                        "replace": {"product_id": target_id, "name": target["name"]},
                        "with": {
                            "product_id": alt["product_id"],
                            "name": alt["name"],
                            "brand": alt.get("brand"),
                            "category": alt["category"],
                        },
                        "improvement": improvement,
                        "base_penalty": base_penalty,
                        "new_penalty": new_penalty,
                        "resolves": [
                            r.nutrient
                            for r in new_summary.itertuples()
                            if r.status not in _FLAG
                            and r.nutrient
                            in [b.nutrient for b in base_summary.itertuples() if b.status in _FLAG]
                        ],
                    }
                )

    results.sort(key=lambda r: -r["improvement"])
    return {
        "flagged_nutrients": flagged,
        "base_penalty": base_penalty,
        "suggestions": results[:max_results],
    }
