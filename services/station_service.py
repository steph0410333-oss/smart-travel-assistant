import json
import math
from functools import lru_cache
from pathlib import Path
from typing import Any

from services.crowd_service import get_historical_crowd


DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@lru_cache
def get_stations() -> list[dict[str, Any]]:
    with (DATA_DIR / "stations.json").open(encoding="utf-8") as file:
        return json.load(file)


@lru_cache
def get_places() -> list[dict[str, Any]]:
    with (DATA_DIR / "places.json").open(encoding="utf-8") as file:
        return json.load(file)


def get_stations_for_time(
    query_time: str | None = None,
    query_date: str | None = None,
) -> list[dict[str, Any]]:
    stations = []
    for station in get_stations():
        public_station = {
            key: station[key]
            for key in (
                "station_id",
                "station_name",
                "display_name",
                "latitude",
                "longitude",
                "line_station_ids",
                "coordinate_method",
                "coordinate_source",
                "official_reference_url",
            )
        }
        estimate = get_historical_crowd(
            station["station_name"],
            query_time=query_time,
            query_date=query_date,
        )
        stations.append(
            {
                **public_station,
                "crowd_index": estimate["crowd_score"],
                "crowd_level": estimate["crowd_level"],
                "crowd_reliability": estimate["reliability"],
                "crowd_sample_count": estimate["sample_count"],
                "crowd_estimate": estimate,
            }
        )
    return stations


def _normalize(text: str) -> str:
    return "".join(text.lower().split())


def resolve_place(query: str) -> dict[str, Any] | None:
    normalized_query = _normalize(query)
    if not normalized_query:
        return None

    candidates: list[tuple[int, dict[str, Any]]] = []
    for place in get_places():
        names = [place["place_name"], *place.get("aliases", [])]
        for name in names:
            normalized_name = _normalize(name)
            if normalized_name == normalized_query:
                return place
            if normalized_name in normalized_query or normalized_query in normalized_name:
                candidates.append((len(normalized_name), place))

    for station in get_stations():
        station_names = {
            _normalize(station["station_name"]),
            _normalize(station.get("display_name", station["station_name"])),
        }
        for normalized_name in station_names:
            normalized_without_suffix = normalized_name.removesuffix("站")
            if (
                normalized_name in normalized_query
                or normalized_without_suffix == normalized_query
            ):
                return {
                    "place_id": f"station:{station['station_id']}",
                    "place_name": station.get("display_name", station["station_name"]),
                    "latitude": station["latitude"],
                    "longitude": station["longitude"],
                    "aliases": [station["station_name"]],
                }

    if candidates:
        return max(candidates, key=lambda item: item[0])[1]
    return None


def _distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    lat1_rad, lat2_rad = math.radians(lat1), math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    value = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    return radius * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def find_nearest_station(latitude: float, longitude: float) -> dict[str, Any]:
    station = min(
        get_stations(),
        key=lambda item: _distance_km(latitude, longitude, item["latitude"], item["longitude"]),
    )
    result = {
        key: station[key]
        for key in (
            "station_id",
            "station_name",
            "display_name",
            "latitude",
            "longitude",
            "line_station_ids",
            "coordinate_method",
        )
    }
    result["distance_m"] = round(
        _distance_km(latitude, longitude, station["latitude"], station["longitude"]) * 1000
    )
    return result
