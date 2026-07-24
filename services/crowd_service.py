import json
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
TAIPEI_TZ = timezone(timedelta(hours=8), name="Asia/Taipei")
WEEKDAY_NAMES = {
    1: "星期一",
    2: "星期二",
    3: "星期三",
    4: "星期四",
    5: "星期五",
    6: "星期六",
    7: "星期日",
}


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


def _decode_profile(
    profile: list[float | int] | dict[str, Any],
    minimum_sample_count: int,
) -> dict[str, Any]:
    if isinstance(profile, dict):
        return profile
    score, sample_count = profile
    return {
        "crowd_score": float(score),
        "crowd_level": _crowd_level(float(score)),
        "sample_count": int(sample_count),
        "reliability": (
            "low" if int(sample_count) < minimum_sample_count else "usable"
        ),
    }


@lru_cache
def get_historical_crowd_data() -> dict[str, Any]:
    with (DATA_DIR / "historical_crowd.json").open(encoding="utf-8") as file:
        return json.load(file)


def _parse_hour(query_time: str | None) -> int:
    if not query_time:
        return datetime.now(TAIPEI_TZ).hour
    try:
        hour = int(query_time.split(":", maxsplit=1)[0])
    except (ValueError, IndexError) as error:
        raise ValueError("時間格式必須是 HH:MM") from error
    if not 0 <= hour <= 23:
        raise ValueError("小時必須介於 0 到 23")
    return hour


def _parse_date(query_date: str | None) -> date:
    if not query_date:
        return datetime.now(TAIPEI_TZ).date()
    try:
        return date.fromisoformat(query_date)
    except ValueError as error:
        raise ValueError("日期格式必須是 YYYY-MM-DD") from error


def _resolve_source_station(station_name: str, station_names: set[str]) -> str | None:
    normalized = "".join(station_name.split())
    if normalized in station_names:
        return normalized
    if normalized.endswith("站") and normalized[:-1] in station_names:
        return normalized[:-1]
    return None


def get_historical_crowd(
    station_name: str,
    query_time: str | None = None,
    query_date: str | None = None,
) -> dict[str, Any]:
    data = get_historical_crowd_data()
    metadata = data["metadata"]
    target_date = _parse_date(query_date)
    hour = _parse_hour(query_time)
    weekday_num = target_date.isoweekday()
    source_station = _resolve_source_station(station_name, set(data["stations"]))
    base = {
        "station_name": station_name,
        "source_station": source_station,
        "query_date": target_date.isoformat(),
        "weekday_num": weekday_num,
        "weekday": WEEKDAY_NAMES[weekday_num],
        "hour": hour,
        "data_period_start": metadata["data_period_start"],
        "data_period_end": metadata["data_period_end"],
        "data_label": metadata["data_label"],
        "minimum_sample_count": metadata["minimum_sample_count"],
    }
    if source_station is None:
        return {
            **base,
            "available": False,
            "reason": "OD資料中找不到對應站名",
            "crowd_score": None,
            "crowd_level": "資料不足",
            "sample_count": 0,
            "reliability": "unavailable",
        }

    profile = (
        data["stations"]
        .get(source_station, {})
        .get(str(weekday_num), {})
        .get(str(hour))
    )
    if profile is None:
        return {
            **base,
            "available": False,
            "reason": "此時段沒有歷史OD紀錄，可能為捷運非營運時段",
            "crowd_score": None,
            "crowd_level": "資料不足",
            "sample_count": 0,
            "reliability": "unavailable",
        }

    decoded_profile = _decode_profile(
        profile,
        metadata["minimum_sample_count"],
    )
    return {
        **base,
        "available": True,
        **decoded_profile,
        "reason": (
            f"樣本僅 {decoded_profile['sample_count']} 筆，未達"
            f"{metadata['minimum_sample_count']}筆門檻"
            if decoded_profile["reliability"] == "low"
            else "歷史樣本已達最低門檻"
        ),
    }


def get_crowd_metadata() -> dict[str, Any]:
    return get_historical_crowd_data()["metadata"].copy()
