import re
from typing import Any

from services.merchant_service import get_merchants


def _minimum_spend(price_range: str) -> int:
    numbers = re.findall(r"\d+", price_range.replace(",", ""))
    return int(numbers[0]) if numbers else 0


def recommend_by_balance(balance: int, limit: int = 3) -> list[dict[str, Any]]:
    """Return mock EasyCard/EasyWallet spending ideas affordable with a TWD balance."""
    candidates = []
    for merchant in get_merchants():
        minimum_spend = _minimum_spend(merchant.get("price_range", ""))
        if minimum_spend <= balance:
            candidates.append(
                {
                    **merchant,
                    "suggested_spend": minimum_spend,
                    "estimated_remaining": balance - minimum_spend,
                    "recommendation_reason": (
                        f"以最低消費約 NT${minimum_spend} 估算，消費後約剩 NT${balance - minimum_spend}。"
                    ),
                }
            )
    candidates.sort(key=lambda item: (item["suggested_spend"], item["merchant_name"]))
    return candidates[: max(1, min(limit, 10))]

