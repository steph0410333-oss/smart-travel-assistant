from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path
from typing import Any


LINE_ORDER = {"BR": 0, "R": 1, "G": 2, "O": 3, "BL": 4, "Y": 5}
OD_TO_PHYSICAL_NAME = {
    "大橋頭站": "大橋頭",
    "BL板橋": "板橋",
    "Y板橋": "板橋",
}
LINE_SPECIFIC_OD_STATIONS = {
    "BL板橋": "BL",
    "Y板橋": "Y",
}
OFFICIAL_DATASET_URL = (
    "https://data.taipei/dataset/detail?"
    "id=cfa4778c-62c1-497b-b704-756231de348b"
)
COORDINATE_MIRROR_URL = (
    "https://github.com/bamboooofish/Taiwan-MRT-Stations-LatLong"
)


def _line_code(station_id: str) -> str:
    return "".join(character for character in station_id if character.isalpha())


def _read_coordinate_rows(source: Path) -> list[dict[str, str]]:
    with source.open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def _read_od_station_names(source: Path) -> list[str]:
    payload = json.loads(source.read_text(encoding="utf-8"))
    return list(payload["stations"])


def _physical_name(od_station_name: str) -> str:
    return OD_TO_PHYSICAL_NAME.get(od_station_name, od_station_name)


def build_station_catalog(
    coordinate_source: Path,
    historical_crowd_source: Path,
) -> list[dict[str, Any]]:
    coordinate_rows = _read_coordinate_rows(coordinate_source)
    rows_by_name: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in coordinate_rows:
        rows_by_name[row["station_name_tw"]].append(row)

    stations: list[dict[str, Any]] = []
    missing: list[str] = []
    for od_station_name in _read_od_station_names(historical_crowd_source):
        physical_name = _physical_name(od_station_name)
        candidates = rows_by_name.get(physical_name, [])
        required_line = LINE_SPECIFIC_OD_STATIONS.get(od_station_name)
        if required_line:
            candidates = [
                row for row in candidates if row["main_line_code"] == required_line
            ]
        if not candidates:
            missing.append(od_station_name)
            continue

        candidates.sort(
            key=lambda row: (
                LINE_ORDER.get(row["main_line_code"], 99),
                row["station_id"],
            )
        )
        latitude = sum(float(row["station_latitude"]) for row in candidates) / len(
            candidates
        )
        longitude = sum(float(row["station_longitude"]) for row in candidates) / len(
            candidates
        )
        line_station_ids = [row["station_id"] for row in candidates]
        stations.append(
            {
                "station_id": "-".join(line_station_ids),
                "station_name": od_station_name,
                "display_name": physical_name,
                "latitude": round(latitude, 7),
                "longitude": round(longitude, 7),
                "line_station_ids": line_station_ids,
                "coordinate_method": (
                    "single_line_station"
                    if len(candidates) == 1
                    else "mean_of_transfer_line_coordinates"
                ),
                "coordinate_source": "Taipei Metro station coordinate mirror",
                "coordinate_source_url": COORDINATE_MIRROR_URL,
                "official_reference_url": OFFICIAL_DATASET_URL,
            }
        )

    if missing:
        raise ValueError(f"缺少座標的 OD 站名：{', '.join(missing)}")
    return stations


def main() -> None:
    parser = argparse.ArgumentParser(
        description="把捷運座標 CSV 與歷史 OD 站名合併為網站 stations.json"
    )
    parser.add_argument("coordinate_source", type=Path)
    parser.add_argument("historical_crowd_source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    stations = build_station_catalog(
        args.coordinate_source,
        args.historical_crowd_source,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(stations, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"輸出 {len(stations)} 筆 OD 站點座標：{args.output}")


if __name__ == "__main__":
    main()
