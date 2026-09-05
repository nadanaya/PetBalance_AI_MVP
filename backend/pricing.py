"""최저가 연동 (F-021).

교체 가능한 PriceProvider 인터페이스. 기본 구현은 data/processed/prices.csv 를
읽는 CsvPriceProvider(데모). 실제 오픈마켓 API 연동 시 이 인터페이스만 구현하면 된다.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
PRICES_CSV = ROOT / "data" / "processed" / "prices.csv"


@dataclass(frozen=True)
class Offer:
    product_id: str
    vendor: str
    price_krw: int
    unit: str
    url: str
    updated_at: str


class PriceProvider(Protocol):
    def offers_for(self, product_id: str) -> list[Offer]: ...


class CsvPriceProvider:
    """data/processed/prices.csv 기반 데모 제공자."""

    def __init__(self, path: Path | None = None) -> None:
        self.path = path or PRICES_CSV
        self._df: pd.DataFrame | None = None

    def _load(self) -> pd.DataFrame:
        if self._df is None:
            self._df = (
                pd.read_csv(self.path)
                if self.path.exists()
                else pd.DataFrame(
                    columns=["product_id", "vendor", "price_krw", "unit", "url", "updated_at"]
                )
            )
        return self._df

    def offers_for(self, product_id: str) -> list[Offer]:
        df = self._load()
        rows = df[df["product_id"] == product_id]
        return sorted(
            (
                Offer(
                    product_id=str(r.product_id),
                    vendor=str(r.vendor),
                    price_krw=int(r.price_krw),
                    unit=str(r.unit),
                    url=str(r.url),
                    updated_at=str(r.updated_at),
                )
                for r in rows.itertuples()
            ),
            key=lambda o: o.price_krw,
        )


_provider: PriceProvider = CsvPriceProvider()


def set_provider(provider: PriceProvider) -> None:
    global _provider
    _provider = provider


def best_offer(product_id: str) -> dict | None:
    offers = _provider.offers_for(product_id)
    if not offers:
        return None
    lo = offers[0]
    return {
        "product_id": product_id,
        "lowest_price_krw": lo.price_krw,
        "lowest_vendor": lo.vendor,
        "offer_count": len(offers),
        "offers": [o.__dict__ for o in offers],
        "source": "demo",
    }
