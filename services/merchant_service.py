import json
import math
from collections import Counter
from functools import lru_cache
from pathlib import Path
from typing import Any


DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "merchants.json"


@lru_cache
def get_merchants() -> list[dict[str, Any]]:
    with DATA_FILE.open(encoding="utf-8") as file:
        return json.load(file)


def _distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    radius_m = 6_371_000
    lat1_rad, lat2_rad = math.radians(lat1), math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    value = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    return round(radius_m * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value)))


def find_nearby_merchants(
    latitude: float,
    longitude: float,
    radius_m: int = 700,
    limit: int = 6,
) -> list[dict[str, Any]]:
    """回傳距離指定地點最近的悠遊付 Mock 商家。"""
    nearby = []
    for merchant in get_merchants():
        if not merchant.get("easywallet_available"):
            continue
        distance = _distance_m(latitude, longitude, merchant["latitude"], merchant["longitude"])
        if distance <= radius_m:
            nearby.append({
                **merchant,
                "distance_m": distance,
                "walking_minutes": max(1, round(distance / 75)),
                "data_label": "MOCK EASYWALLET MERCHANT",
            })
    nearby.sort(key=lambda item: (item["distance_m"], not item["discount_available"]))
    return nearby[:limit]


def summarize_merchants(merchants: list[dict[str, Any]]) -> dict[str, Any]:
    categories = Counter(merchant["category"] for merchant in merchants)
    return {
        "total": len(merchants),
        "category_counts": dict(categories),
        "discount_count": sum(bool(merchant["discount_available"]) for merchant in merchants),
    }
