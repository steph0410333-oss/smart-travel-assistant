from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from openpyxl import load_workbook


PROFILE_SHEET = "星期時段平均擁擠度"
QUALITY_SHEET = "資料品質"
MINIMUM_SAMPLE_COUNT = 8


def _quality_metadata(workbook) -> dict[str, Any]:
    sheet = workbook[QUALITY_SHEET]
    values = {
        str(item): value
        for item, value in sheet.iter_rows(min_row=2, values_only=True)
        if item is not None
    }
    return {
        "data_period_start": values.get("earliest_date"),
        "data_period_end": values.get("latest_date"),
        "source_month_count": values.get("month_count"),
        "source_od_rows": values.get("od_raw_rows"),
        "station_count": values.get("station_count"),
        "station_hour_rows": values.get("station_hour_rows"),
    }


def build_payload(source: Path) -> dict[str, Any]:
    workbook = load_workbook(source, read_only=True, data_only=True)
    metadata = _quality_metadata(workbook)
    sheet = workbook[PROFILE_SHEET]
    rows = sheet.iter_rows(values_only=True)
    headers = [str(value) for value in next(rows)]
    index = {name: headers.index(name) for name in headers}

    stations: dict[str, dict[str, dict[str, dict[str, Any]]]] = {}
    profile_count = 0
    for row in rows:
        station = str(row[index["station"]])
        weekday = str(int(row[index["weekday_num"]]))
        hour = str(int(row[index["hour"]]))
        sample_count = int(row[index["sample_count"]])
        score = row[index["average_crowd_score"]]
        if score is None:
            continue
        stations.setdefault(station, {}).setdefault(weekday, {})[hour] = [
            round(float(score), 2),
            sample_count,
        ]
        profile_count += 1

    return {
        "metadata": {
            **metadata,
            "source_workbook": source.name,
            "profile_sheet": PROFILE_SHEET,
            "model_name": "歷史相對人流擁擠指數",
            "lookup_key": ["station", "weekday_num", "hour"],
            "profile_encoding": ["crowd_score", "sample_count"],
            "minimum_sample_count": MINIMUM_SAMPLE_COUNT,
            "profile_count": profile_count,
            "data_label": "歷史OD推估，非即時站內人數",
            "limitations": [
                "目前僅有一個月資料，所有時段可靠度皆低。",
                "crowd_score是相對於該站自身歷史的流量壓力，不是官方容量使用率。",
                "進站加出站代表交通活動量，不是站內同時存在人數。",
            ],
        },
        "stations": stations,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="將OD分析Excel轉為網站用歷史人流JSON")
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    payload = build_payload(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(
        f"輸出 {payload['metadata']['profile_count']} 筆、"
        f"{len(payload['stations'])} 站：{args.output}"
    )


if __name__ == "__main__":
    main()
