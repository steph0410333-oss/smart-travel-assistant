from typing import Any


def _clamp(value: float) -> int:
    return round(max(0, min(100, value)))


def _parse_hour(query_time: str | None) -> int | None:
    if not query_time:
        return None
    try:
        hour = int(query_time.split(":", maxsplit=1)[0])
    except (ValueError, IndexError):
        return None
    return hour if 0 <= hour <= 23 else None


def _time_adjustment(query_time: str | None) -> tuple[int, str]:
    hour = _parse_hour(query_time)
    if hour is None:
        return 0, "未指定時間，使用目前模擬人流"

    if 7 <= hour <= 9:
        return 8, "查詢時間為通勤早尖峰，模擬人流上調"
    if 17 <= hour <= 20:
        return 10, "查詢時間為通勤晚尖峰，模擬人流上調"
    if 11 <= hour <= 14:
        return 4, "查詢時間為午間時段，模擬人流略微上調"
    if hour >= 22 or hour <= 5:
        return -8, "查詢時間為離峰時段，模擬人流下調"
    return 0, "一般時段，不調整模擬人流"


def analyze_station_comfort(
    station: dict[str, Any],
    query_time: str | None = None,
    preferences: list[str] | None = None,
    station_distance_m: int = 0,
) -> dict[str, Any]:
    preferences = preferences or []
    time_delta, time_reason = _time_adjustment(query_time)
    query_hour = _parse_hour(query_time)
    crowd_index = _clamp(station["crowd_index"] + time_delta)
    nearby_index = _clamp(station["nearby_crowd_index"] + time_delta * 0.6)
    peak_index = _clamp(station["peak_index"] + max(0, time_delta))
    event_pressure = 100 if station.get("event_flag") and query_hour is not None and 17 <= query_hour <= 21 else 0

    base_score = _clamp(
        100
        - 0.45 * crowd_index
        - 0.18 * nearby_index
        - 0.12 * peak_index
        - 0.10 * event_pressure
    )

    preference_penalty = 0
    personalized_reasons: list[str] = []
    if "不想太擠" in preferences and crowd_index >= 60:
        preference_penalty += 8
        personalized_reasons.append("你選擇不想太擠，因此降低個人化分數")
    if "少走路" in preferences and station_distance_m > 500:
        preference_penalty += 6 if station_distance_m <= 800 else 12
        personalized_reasons.append("目的地距離最近捷運站較遠，不符合少走路偏好")

    score = _clamp(base_score - preference_penalty)

    if score >= 75:
        status = "舒適"
    elif score >= 55:
        status = "尚可"
    elif score >= 35:
        status = "偏擠"
    else:
        status = "擁擠"

    if crowd_index >= 80:
        crowd_reason = "查詢時段的模擬站內人流非常擁擠"
    elif crowd_index >= 60:
        crowd_reason = "查詢時段的模擬站內人流偏高"
    elif crowd_index >= 40:
        crowd_reason = "查詢時段的模擬站內人流普通"
    else:
        crowd_reason = "查詢時段的模擬站內人流較少"
    reasons = [crowd_reason, time_reason]
    if nearby_index >= 70:
        reasons.append("車站周邊模擬人流偏高")
    elif nearby_index <= 35:
        reasons.append("車站周邊模擬人流較低")
    if station.get("event_flag"):
        reasons.append("附近設有模擬活動事件；活動壓力只在晚間時段計入分數")
    reasons.extend(personalized_reasons)

    if score < 45:
        advice = "目前最近捷運站較擁擠，建議錯開尖峰或比較鄰近替代站。"
    elif score < 75:
        advice = "目前人流尚可，仍建議預留候車與步行時間。"
    else:
        advice = "目前模擬人流較舒適，適合依原計畫前往。"

    return {
        "base_comfort_score": base_score,
        "comfort_score": score,
        "status": status,
        "reasons": reasons,
        "advice": advice,
        "factors": {
            "effective_crowd_index": crowd_index,
            "effective_nearby_crowd_index": nearby_index,
            "effective_peak_index": peak_index,
            "event_pressure": event_pressure,
            "preference_penalty": preference_penalty,
        },
        "formula": "100 - 0.45*crowd - 0.18*nearby - 0.12*peak - 0.10*event - preference_penalty",
        "assumption": "所有人流、時間調整與事件資料皆為 Prototype 模擬邏輯",
    }
