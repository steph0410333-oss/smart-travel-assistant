from typing import Any

from services.crowd_service import get_historical_crowd
from services.external_factor_service import (
    calculate_adjusted_crowd_score,
    evaluate_external_factors,
)


def _clamp(value: float) -> int:
    return round(max(0, min(100, value)))


def _crowd_level(score: float) -> str:
    if score >= 85:
        return "非常擁擠"
    if score >= 70:
        return "擁擠"
    if score >= 55:
        return "偏擠"
    if score >= 35:
        return "普通"
    return "舒適"


def analyze_station_comfort(
    station: dict[str, Any],
    query_time: str | None = None,
    query_date: str | None = None,
    preferences: list[str] | None = None,
    station_distance_m: int = 0,
    crowd_estimate: dict[str, Any] | None = None,
    weather_type: str | None = None,
    place_type: str | None = None,
    enable_external_factors: bool = False,
    external_events: list[dict[str, Any]] | None = None,
    prototype_holidays: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    preferences = preferences or []
    estimate = crowd_estimate or get_historical_crowd(
        station.get("station_name", ""),
        query_time=query_time,
        query_date=query_date,
    )
    factor_date = query_date or estimate.get("query_date")
    factor_time = query_time
    if factor_time is None and estimate.get("hour") is not None:
        factor_time = f"{int(estimate['hour']):02d}:00"
    external_factors = evaluate_external_factors(
        query_date=factor_date,
        query_time=factor_time,
        weather_type=weather_type,
        place_type=place_type,
        latitude=station.get("latitude"),
        longitude=station.get("longitude"),
        enabled=enable_external_factors,
        holidays=prototype_holidays,
        events=external_events,
    )

    if not estimate["available"]:
        return {
            "historical_crowd_score": None,
            "adjusted_crowd_score": None,
            "adjusted_crowd_level": "資料不足",
            "environment_comfort_score": None,
            "personalized_comfort_score": None,
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
                "station_distance_m": station_distance_m,
                "station_distance_measurement": "straight_line_proxy",
            },
            "crowd_estimate": estimate,
            "external_factors": external_factors,
            "formula": None,
            "assumption": (
                "歷史OD推估，非即時站內人數；車站距離為目的地到最近捷運站的"
                "直線距離代理值，非真實步行路線距離"
            ),
        }

    historical_crowd_score = float(estimate["crowd_score"])
    adjusted_crowd_score = calculate_adjusted_crowd_score(
        historical_crowd_score,
        external_factors,
    )
    adjusted_crowd_level = _crowd_level(adjusted_crowd_score)
    environment_score = _clamp(100 - adjusted_crowd_score)
    preference_penalty = 0
    personalized_reasons: list[str] = []
    if "不想太擠" in preferences and adjusted_crowd_score >= 55:
        preference_penalty += 8
        personalized_reasons.append(
            "你選擇不想太擠，因此降低個人化舒適分數"
        )
    if "少走路" in preferences and station_distance_m > 500:
        preference_penalty += 6 if station_distance_m <= 800 else 12
        personalized_reasons.append(
            "目的地到最近捷運站的直線距離代理值較遠，不符合少走路偏好；"
            "此距離不代表真實步行路線"
        )

    personalized_score = _clamp(environment_score - preference_penalty)
    if personalized_score >= 66:
        status = "舒適"
    elif personalized_score >= 46:
        status = "尚可"
    elif personalized_score >= 31:
        status = "偏擠"
    else:
        status = "擁擠"

    reasons = [
        (
            f"{estimate['weekday']}{estimate['hour']:02d}:00 的40/40/10/10"
            f"歷史人流壓力為{historical_crowd_score:.0f}分"
            f"（{estimate['crowd_level']}）"
        ),
        (
            f"依據 {estimate['data_period_start']} 至 {estimate['data_period_end']} "
            f"OD歷史資料；模型版本 {estimate['model_version']}"
        ),
    ]
    if estimate["reliability"] == "low":
        reasons.append(
            f"目前僅 {estimate['sample_count']} 筆同星期同時段樣本，可靠度低"
        )
    if enable_external_factors:
        reasons.append(
            "已套用Prototype假日、天氣與Mock活動外部修正；"
            f"調整後人流壓力為{adjusted_crowd_score:.2f}分"
            f"（{adjusted_crowd_level}）"
        )
        reasons.extend(external_factors["warnings"])
    reasons.extend(personalized_reasons)

    if personalized_score < 31:
        advice = "個人化舒適分數較低，建議錯峰或比較鄰近替代站。"
    elif personalized_score < 66:
        advice = "個人化舒適分數屬中間區間，建議預留候車與移動時間。"
    else:
        advice = "個人化舒適分數顯示此時段相對舒適，可依原計畫前往。"

    return {
        "historical_crowd_score": historical_crowd_score,
        "adjusted_crowd_score": adjusted_crowd_score,
        "adjusted_crowd_level": adjusted_crowd_level,
        "environment_comfort_score": environment_score,
        "personalized_comfort_score": personalized_score,
        "base_comfort_score": environment_score,
        "comfort_score": personalized_score,
        "status": status,
        "reasons": reasons,
        "advice": advice,
        "factors": {
            "effective_crowd_index": adjusted_crowd_score,
            "effective_nearby_crowd_index": None,
            "effective_peak_index": None,
            "preference_penalty": preference_penalty,
            "station_distance_m": station_distance_m,
            "station_distance_measurement": "straight_line_proxy",
        },
        "crowd_estimate": estimate,
        "external_factors": external_factors,
        "formula": (
            "adjusted_crowd_score = clamp(crowd_40_40_10_10_v1 * "
            "holiday_coefficient * weather_coefficient + event_pressure_score); "
            "environment_comfort_score = 100 - adjusted_crowd_score; "
            "personalized_comfort_score = environment_comfort_score "
            "- preference_penalty"
        ),
        "assumption": (
            "基礎人流為40/40/10/10歷史OD推估相對分數；外部因素為規則式Prototype，"
            "不是即時天氣、官方假日或即時活動資料；車站距離為直線距離代理值"
        ),
    }
