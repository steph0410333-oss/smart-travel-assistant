from typing import Any

from services.crowd_service import get_historical_crowd


def _clamp(value: float) -> int:
    return round(max(0, min(100, value)))


def analyze_station_comfort(
    station: dict[str, Any],
    query_time: str | None = None,
    query_date: str | None = None,
    preferences: list[str] | None = None,
    station_distance_m: int = 0,
    crowd_estimate: dict[str, Any] | None = None,
) -> dict[str, Any]:
    preferences = preferences or []
    estimate = crowd_estimate or get_historical_crowd(
        station.get("station_name", ""),
        query_time=query_time,
        query_date=query_date,
    )

    if not estimate["available"]:
        return {
            "base_comfort_score": None,
            "comfort_score": None,
            "status": "資料不足",
            "reasons": [
                estimate["reason"],
                "系統不會以模擬值補上缺少的OD歷史資料",
            ],
            "advice": "此時段沒有足夠的捷運歷史資料，請改選營運時段再查詢。",
            "factors": {
                "effective_crowd_index": None,
                "effective_nearby_crowd_index": None,
                "effective_peak_index": None,
                "preference_penalty": 0,
            },
            "crowd_estimate": estimate,
            "formula": None,
            "assumption": "歷史OD推估，非即時站內人數",
        }

    crowd_index = float(estimate["crowd_score"])
    base_score = _clamp(100 - crowd_index)
    preference_penalty = 0
    personalized_reasons: list[str] = []
    if "不想太擠" in preferences and crowd_index >= 55:
        preference_penalty += 8
        personalized_reasons.append("你選擇不想太擠，因此降低個人化舒適分數")
    if "少走路" in preferences and station_distance_m > 500:
        preference_penalty += 6 if station_distance_m <= 800 else 12
        personalized_reasons.append("目的地距離最近捷運站較遠，不符合少走路偏好")

    score = _clamp(base_score - preference_penalty)
    if score >= 66:
        status = "舒適"
    elif score >= 46:
        status = "尚可"
    elif score >= 31:
        status = "偏擠"
    else:
        status = "擁擠"

    reasons = [
        (
            f"{estimate['weekday']}{estimate['hour']:02d}:00 的歷史人流壓力為"
            f"{estimate['crowd_score']:.0f}分（{estimate['crowd_level']}）"
        ),
        (
            f"依據 {estimate['data_period_start']} 至 {estimate['data_period_end']} "
            "OD歷史資料推估"
        ),
    ]
    if estimate["reliability"] == "low":
        reasons.append(
            f"目前僅 {estimate['sample_count']} 筆同星期同時段樣本，可靠度低"
        )
    reasons.extend(personalized_reasons)

    if score < 31:
        advice = "歷史資料顯示此時段較擁擠，建議錯峰或比較鄰近替代站。"
    elif score < 66:
        advice = "歷史人流屬中間區間，建議預留候車與步行時間。"
    else:
        advice = "歷史資料顯示此時段相對舒適，可依原計畫前往。"

    return {
        "base_comfort_score": base_score,
        "comfort_score": score,
        "status": status,
        "reasons": reasons,
        "advice": advice,
        "factors": {
            "effective_crowd_index": round(crowd_index, 2),
            "effective_nearby_crowd_index": None,
            "effective_peak_index": None,
            "preference_penalty": preference_penalty,
        },
        "crowd_estimate": estimate,
        "formula": "comfort_score = 100 - historical_crowd_score - preference_penalty",
        "assumption": "歷史OD推估，非即時站內人數；周邊實際人數未納入",
    }
