import json
import math
from datetime import date, datetime, time, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any


DATA_FILE = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "prototype_external_factors.json"
)
TAIPEI_TZ = timezone(timedelta(hours=8), name="Asia/Taipei")
DATE_COEFFICIENTS = {
    "weekday": 1.00,
    "weekend": 1.00,
    "holiday": 1.15,
}
WEATHER_COEFFICIENTS = {
    "outdoor": {"sunny": 1.00, "rain": 0.75, "heavy_rain": 0.45},
    "mall": {"sunny": 1.00, "rain": 1.10, "heavy_rain": 0.90},
    "transit": {"sunny": 1.00, "rain": 0.95, "heavy_rain": 0.75},
    "venue": {"sunny": 1.00, "rain": 0.95, "heavy_rain": 0.80},
}


@lru_cache
def get_prototype_external_factor_data() -> dict[str, Any]:
    with DATA_FILE.open(encoding="utf-8") as file:
        return json.load(file)


def _as_date(value: str | date | None) -> date:
    if isinstance(value, date):
        return value
    if value:
        return date.fromisoformat(value)
    return datetime.now(TAIPEI_TZ).date()


def _as_query_datetime(
    query_date: str | date | None,
    query_time: str | None,
) -> datetime:
    target_date = _as_date(query_date)
    if query_time:
        hour, minute = (int(part) for part in query_time.split(":", maxsplit=1))
        target_time = time(hour, minute)
    else:
        current = datetime.now(TAIPEI_TZ)
        target_time = time(current.hour, current.minute)
    return datetime.combine(target_date, target_time, tzinfo=TAIPEI_TZ)


def _as_event_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=TAIPEI_TZ)
    return parsed.astimezone(TAIPEI_TZ)


def get_date_factor(
    query_date: str | date | None,
    *,
    enabled: bool,
    holidays: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    target_date = _as_date(query_date)
    holiday_rows = (
        holidays
        if holidays is not None
        else get_prototype_external_factor_data()["holidays"]
    )
    holiday_dates = {row["date"] for row in holiday_rows}
    if target_date.isoformat() in holiday_dates:
        date_type = "holiday"
    elif target_date.weekday() >= 5:
        date_type = "weekend"
    else:
        date_type = "weekday"

    coefficient = DATE_COEFFICIENTS[date_type] if enabled else 1.0
    warnings = []
    applied = enabled and date_type == "holiday"
    if enabled and date_type == "weekend":
        warnings.append(
            "基礎OD分數已依星期幾建模，週末不再額外加乘，避免重複計算"
        )
    return {
        "date_type": date_type,
        "coefficient": coefficient,
        "applied": applied,
        "baseline_weekday_adjusted": True,
        "warnings": warnings,
    }


def get_weather_factor(
    weather_type: str | None,
    place_type: str | None,
    *,
    enabled: bool,
) -> dict[str, Any]:
    result = {
        "weather_type": weather_type,
        "place_type": place_type,
        "coefficient": 1.0,
        "applied": False,
        "warnings": [],
    }
    if not enabled:
        return result
    if weather_type is None:
        result["warnings"].append(
            "未提供 weather_type，使用中性係數1.0"
        )
    if place_type is None:
        result["warnings"].append(
            "地點尚未設定 place_type，使用中性係數1.0"
        )
    if weather_type is None or place_type is None:
        return result
    if place_type not in WEATHER_COEFFICIENTS:
        result["warnings"].append(
            f"未知 place_type「{place_type}」，使用中性係數1.0"
        )
        return result
    if weather_type not in WEATHER_COEFFICIENTS[place_type]:
        result["warnings"].append(
            f"未知 weather_type「{weather_type}」，使用中性係數1.0"
        )
        return result
    result["coefficient"] = WEATHER_COEFFICIENTS[place_type][weather_type]
    result["applied"] = True
    return result


def _distance_m(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> int:
    radius_km = 6371.0
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    value = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(delta_lon / 2) ** 2
    )
    return round(
        radius_km
        * 2
        * math.atan2(math.sqrt(value), math.sqrt(1 - value))
        * 1000
    )


def _event_scale_score(expected_attendance: int) -> int:
    if expected_attendance < 1000:
        return 4
    if expected_attendance < 5000:
        return 8
    if expected_attendance < 10000:
        return 14
    return 20


def _distance_weight(distance_m: int) -> float:
    if distance_m <= 500:
        return 1.0
    if distance_m <= 1000:
        return 0.70
    if distance_m <= 2000:
        return 0.35
    return 0.0


def _time_proximity_weight(
    query_datetime: datetime,
    start_datetime: datetime,
    end_datetime: datetime,
) -> float:
    if start_datetime <= query_datetime <= end_datetime:
        return 0.65
    if query_datetime < start_datetime:
        time_before = start_datetime - query_datetime
        if time_before <= timedelta(hours=2):
            return 1.0
        if time_before <= timedelta(hours=4):
            return 0.40
        return 0.0
    time_after = query_datetime - end_datetime
    if time_after <= timedelta(hours=1):
        return 1.0
    if time_after <= timedelta(hours=2):
        return 0.40
    return 0.0


def calculate_event_pressure(
    latitude: float | None,
    longitude: float | None,
    query_date: str | date | None,
    query_time: str | None,
    *,
    enabled: bool,
    events: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    result = {
        "event_pressure_score": 0.0,
        "raw_event_pressure_score": 0.0,
        "matched_events": [],
        "capped": False,
        "warnings": [],
    }
    if not enabled:
        return result
    if latitude is None or longitude is None:
        result["warnings"].append("缺少車站經緯度，無法套用活動壓力")
        return result

    query_datetime = _as_query_datetime(query_date, query_time)
    event_rows = (
        events
        if events is not None
        else get_prototype_external_factor_data()["events"]
    )
    matched_events = []
    raw_total = 0.0
    for event in event_rows:
        distance_m = _distance_m(
            latitude,
            longitude,
            float(event["latitude"]),
            float(event["longitude"]),
        )
        distance_weight = _distance_weight(distance_m)
        time_weight = _time_proximity_weight(
            query_datetime,
            _as_event_datetime(event["start_datetime"]),
            _as_event_datetime(event["end_datetime"]),
        )
        scale_score = _event_scale_score(int(event["expected_attendance"]))
        contribution = scale_score * distance_weight * time_weight
        if contribution <= 0:
            continue
        contribution = round(contribution, 2)
        raw_total += contribution
        matched_events.append(
            {
                "event_id": event["event_id"],
                "event_name": event["event_name"],
                "distance_m": distance_m,
                "event_scale_score": scale_score,
                "distance_weight": distance_weight,
                "time_proximity_weight": time_weight,
                "pressure_contribution": contribution,
            }
        )

    raw_total = round(raw_total, 2)
    capped = raw_total > 30
    result.update(
        {
            "event_pressure_score": min(raw_total, 30),
            "raw_event_pressure_score": raw_total,
            "matched_events": matched_events,
            "capped": capped,
        }
    )
    if capped:
        result["warnings"].append("活動壓力總和已套用30分上限")
    return result


def evaluate_external_factors(
    *,
    query_date: str | date | None,
    query_time: str | None,
    weather_type: str | None,
    place_type: str | None,
    latitude: float | None,
    longitude: float | None,
    enabled: bool,
    holidays: list[dict[str, Any]] | None = None,
    events: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    date_factor = get_date_factor(
        query_date,
        enabled=enabled,
        holidays=holidays,
    )
    weather_factor = get_weather_factor(
        weather_type,
        place_type,
        enabled=enabled,
    )
    event_factor = calculate_event_pressure(
        latitude,
        longitude,
        query_date,
        query_time,
        enabled=enabled,
        events=events,
    )
    warnings = [
        *date_factor["warnings"],
        *weather_factor["warnings"],
        *event_factor["warnings"],
    ]
    return {
        "enabled": enabled,
        "data_label": "PROTOTYPE EXTERNAL FACTORS / NOT REAL-TIME",
        "date": date_factor,
        "weather": weather_factor,
        "event": event_factor,
        "warnings": warnings,
    }


def calculate_adjusted_crowd_score(
    historical_crowd_score: float,
    external_factors: dict[str, Any],
) -> float:
    adjusted = (
        historical_crowd_score
        * external_factors["date"]["coefficient"]
        * external_factors["weather"]["coefficient"]
        + external_factors["event"]["event_pressure_score"]
    )
    return round(max(0.0, min(100.0, adjusted)), 2)
