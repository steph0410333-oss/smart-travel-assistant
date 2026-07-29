from typing import Any

from services.comfort_service import analyze_station_comfort
from services.merchant_service import find_nearby_merchants, summarize_merchants
from services.station_service import find_nearest_station, get_places


def _feature_matches(requested: str, available: list[str]) -> bool:
    return any(
        requested in feature or feature in requested
        for feature in available
    )


def _personalized_comfort_score(
    comfort: dict[str, Any],
) -> float | None:
    if "personalized_comfort_score" in comfort:
        return comfort["personalized_comfort_score"]
    return comfort.get("comfort_score")


def recommend_places(
    intent: dict[str, Any],
    limit: int = 3,
    *,
    query_date: str | None = None,
    weather_type: str | None = None,
    enable_external_factors: bool = False,
) -> list[dict[str, Any]]:
    requested_categories = intent["categories"]
    requested_features = intent["features"]
    budget_max = intent["budget_max"]
    preferences = (
        ["不想太擠"]
        if intent["crowd_preference"] == "low"
        else []
    )
    results = []

    for place in get_places():
        nearest_station = find_nearest_station(
            place["latitude"],
            place["longitude"],
        )
        comfort = analyze_station_comfort(
            nearest_station,
            query_time=intent["time"],
            query_date=query_date,
            preferences=preferences,
            station_distance_m=nearest_station["distance_m"],
            weather_type=weather_type,
            place_type=place.get("place_type"),
            enable_external_factors=enable_external_factors,
        )
        nearby_merchants = find_nearby_merchants(
            place["latitude"],
            place["longitude"],
        )

        matched_categories = [
            item
            for item in requested_categories
            if item in place["categories"]
        ]
        matched_features = [
            item
            for item in requested_features
            if _feature_matches(item, place["features"])
        ]

        category_score = (
            30
            if not requested_categories
            else 30 * len(matched_categories) / len(requested_categories)
        )
        feature_score = (
            20
            if not requested_features
            else 20 * len(matched_features) / len(requested_features)
        )
        if budget_max is None:
            budget_score = 15
            budget_match = True
        else:
            budget_match = place["typical_budget"] <= budget_max
            budget_score = (
                15
                if budget_match
                else max(
                    0,
                    15 - (place["typical_budget"] - budget_max) / 20,
                )
            )

        personalized_score = _personalized_comfort_score(comfort)
        comfort_for_ranking = (
            personalized_score
            if personalized_score is not None
            else 0
        )
        comfort_component_score = 0.35 * comfort_for_ranking
        recommendation_score = round(
            comfort_component_score
            + category_score
            + feature_score
            + budget_score
        )

        reasons = []
        if matched_categories:
            reasons.append("符合「" + "、".join(matched_categories) + "」需求")
        if matched_features:
            reasons.append("具備「" + "、".join(matched_features) + "」相關選項")
        if budget_match and budget_max is not None:
            reasons.append(
                f"典型消費約 {place['typical_budget']} 元，在預算內"
            )
        reasons.append(
            f"最近的 {nearest_station['station_name']} "
            f"查詢時段推估為「{comfort['status']}」"
        )

        results.append(
            {
                "resolved_place": {
                    **place,
                    "place_type": place.get("place_type"),
                },
                "nearest_station": nearest_station,
                "comfort": comfort,
                "comfort_component_score": comfort_component_score,
                "category_match_score": category_score,
                "feature_match_score": feature_score,
                "budget_match_score": budget_score,
                "component_scores": {
                    "personalized_comfort": round(comfort_component_score, 2),
                    "category_match": round(category_score, 2),
                    "feature_match": round(feature_score, 2),
                    "budget_match": round(budget_score, 2),
                },
                "recommendation_score": recommendation_score,
                "recommendation_reasons": reasons,
                "matched_categories": matched_categories,
                "matched_features": matched_features,
                "budget_match": budget_match,
                "nearby_merchants": nearby_merchants,
                "merchant_summary": summarize_merchants(nearby_merchants),
            }
        )

    results.sort(
        key=lambda item: (
            item["recommendation_score"],
            _personalized_comfort_score(item["comfort"]) or 0,
        ),
        reverse=True,
    )
    return results[:limit]
