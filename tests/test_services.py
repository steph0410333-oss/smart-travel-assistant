import hashlib
import unittest
from pathlib import Path

from agent.gemini_adapter import GeminiTravelAdapter
from agent.travel_decision_agent import TravelDecisionAgent
from services.comfort_service import analyze_station_comfort
from services.crowd_service import get_crowd_metadata, get_historical_crowd
from services.external_factor_service import (
    calculate_event_pressure,
    get_date_factor,
    get_weather_factor,
)
from services.balance_service import recommend_by_balance
from services.intent_service import parse_recommendation_intent
from services.merchant_service import find_nearby_merchants, get_merchants, summarize_merchants
from services.recommendation_service import recommend_places
from services.station_service import (
    find_nearest_station,
    get_station_trend,
    get_stations,
    resolve_place,
)


class StationServiceTests(unittest.TestCase):
    def test_station_catalog_covers_all_od_stations(self) -> None:
        stations = get_stations()
        self.assertEqual(len(stations), 119)
        self.assertEqual(len({station["station_name"] for station in stations}), 119)
        self.assertTrue(all(station["station_name_en"] for station in stations))
        self.assertFalse(any(
            any("\u4e00" <= character <= "\u9fff" for character in station["station_name_en"])
            for station in stations
        ))
        self.assertTrue(all(station["line_station_ids"] for station in stations))

    def test_banqiao_od_lines_remain_separate(self) -> None:
        stations = {
            station["station_name"]: station
            for station in get_stations()
        }
        self.assertEqual(stations["BL板橋"]["line_station_ids"], ["BL07"])
        self.assertEqual(stations["Y板橋"]["line_station_ids"], ["Y16"])

    def test_physical_banqiao_name_resolves_without_knowing_line_prefix(self) -> None:
        place = resolve_place("板橋站")
        self.assertIsNotNone(place)
        self.assertEqual(place["place_name"], "板橋")

    def test_exact_station_name_takes_priority_over_nearby_district_place(self) -> None:
        place = resolve_place("台北車站")
        self.assertIsNotNone(place)
        self.assertEqual(place["place_id"], "station:R10-BL12")
        self.assertEqual(place["place_type"], "transit")

    def test_resolves_place_alias_and_finds_nearest_station(self) -> None:
        place = resolve_place("我想去小巨蛋")
        self.assertIsNotNone(place)
        station = find_nearest_station(place["latitude"], place["longitude"])
        self.assertEqual(station["station_name"], "台北小巨蛋")
        self.assertEqual(station["station_name_en"], "Taipei Arena")
        self.assertLess(station["distance_m"], 300)

    def test_resolves_official_english_station_name(self) -> None:
        place = resolve_place("Taipei Arena")
        self.assertIsNotNone(place)
        self.assertEqual(place["place_name"], "台北小巨蛋")
        self.assertEqual(place["place_name_en"], "Taipei Arena")

    def test_station_trend_uses_selected_weekday_for_all_hours(self) -> None:
        trend = get_station_trend("R11-G14", query_date="2026-07-24")
        self.assertIsNotNone(trend)
        self.assertEqual(trend["weekday_num"], 5)
        self.assertEqual([point["hour"] for point in trend["points"]], list(range(24)))
        self.assertTrue(all(
            point["crowd_score"] is None or 0 <= point["crowd_score"] <= 100
            for point in trend["points"]
        ))
        self.assertTrue(all(
            trend["points"][hour]["unavailable_reason"] == "non_operating"
            for hour in (2, 3, 4)
        ))
        self.assertIsNone(trend["points"][5]["unavailable_reason"])

    def test_resolves_localized_place_suggestion_name(self) -> None:
        place = resolve_place("Shilin Night Market")
        self.assertIsNotNone(place)
        self.assertEqual(place["place_name"], "士林夜市")
        self.assertEqual(place["place_name_ja"], "士林夜市")
        self.assertEqual(place["place_name_ko"], "스린 야시장")


class ComfortServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.station = {
            "station_name": "中山站",
        }
        self.estimate = {
            "available": True,
            "crowd_score": 70.0,
            "crowd_level": "擁擠",
            "sample_count": 4,
            "reliability": "low",
            "weekday": "星期五",
            "weekday_num": 5,
            "hour": 19,
            "query_date": "2026-07-24",
            "data_period_start": "2026-06-01",
            "data_period_end": "2026-06-30",
            "model_version": "crowd_40_40_10_10_v1",
        }

    def test_historical_crowd_score_is_inverted_to_comfort(self) -> None:
        result = analyze_station_comfort(
            self.station,
            "19:00",
            crowd_estimate=self.estimate,
        )
        self.assertEqual(result["base_comfort_score"], 30)
        self.assertEqual(result["status"], "擁擠")
        self.assertIn("歷史OD推估", result["assumption"])

    def test_crowd_preference_adds_personalized_penalty(self) -> None:
        normal = analyze_station_comfort(
            self.station,
            "19:00",
            crowd_estimate=self.estimate,
        )
        personalized = analyze_station_comfort(
            self.station,
            "19:00",
            preferences=["不想太擠"],
            crowd_estimate=self.estimate,
        )
        self.assertLess(personalized["comfort_score"], normal["comfort_score"])

    def test_non_operating_hour_returns_no_score(self) -> None:
        result = analyze_station_comfort(
            self.station,
            "03:00",
            query_date="2026-07-24",
        )
        self.assertIsNone(result["comfort_score"])
        self.assertEqual(result["status"], "資料不足")

    def test_external_factors_adjust_before_personalization(self) -> None:
        station = {
            "station_name": "台北小巨蛋",
            "latitude": 25.0514,
            "longitude": 121.5501,
        }
        result = analyze_station_comfort(
            station,
            "17:30",
            query_date="2026-08-15",
            preferences=["不想太擠"],
            crowd_estimate=self.estimate,
            weather_type="rain",
            place_type="venue",
            enable_external_factors=True,
        )
        self.assertEqual(result["historical_crowd_score"], 70)
        self.assertEqual(result["adjusted_crowd_score"], 86.5)
        self.assertEqual(result["environment_comfort_score"], 14)
        self.assertEqual(result["personalized_comfort_score"], 6)
        self.assertEqual(result["base_comfort_score"], 14)
        self.assertEqual(result["comfort_score"], 6)
        self.assertTrue(result["external_factors"]["enabled"])


class ExternalFactorServiceTests(unittest.TestCase):
    def test_weekend_is_neutral_because_baseline_already_uses_weekday(self) -> None:
        factor = get_date_factor("2026-08-15", enabled=True)
        self.assertEqual(factor["date_type"], "weekend")
        self.assertEqual(factor["coefficient"], 1.0)
        self.assertFalse(factor["applied"])
        self.assertTrue(any("避免重複計算" in warning for warning in factor["warnings"]))

    def test_prototype_holiday_and_outdoor_rain_coefficients(self) -> None:
        holiday = get_date_factor("2026-10-10", enabled=True)
        weather = get_weather_factor("rain", "outdoor", enabled=True)
        self.assertEqual(holiday["coefficient"], 1.15)
        self.assertTrue(holiday["applied"])
        self.assertEqual(weather["coefficient"], 0.75)
        self.assertTrue(weather["applied"])

    def test_mock_event_adds_pressure_near_start_time(self) -> None:
        factor = calculate_event_pressure(
            25.0514,
            121.5501,
            "2026-08-15",
            "17:30",
            enabled=True,
        )
        self.assertEqual(factor["event_pressure_score"], 20)
        self.assertEqual(factor["matched_events"][0]["event_id"], "EVT001")


class CrowdServiceTests(unittest.TestCase):
    def test_json_cache_matches_source_workbook_checksum(self) -> None:
        source = (
            Path(__file__).resolve().parent.parent
            / "data"
            / "hourly_crowd_scores_weekday_hour_40_40_10_10.xlsx"
        )
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        self.assertEqual(get_crowd_metadata()["source_sha256"], digest)

    def test_uses_40_40_10_10_model_metadata(self) -> None:
        metadata = get_crowd_metadata()
        self.assertEqual(metadata["model_version"], "crowd_40_40_10_10_v1")
        self.assertEqual(metadata["profile_sheet"], "星期時段擁擠度")
        self.assertEqual(metadata["profile_count"], 17493)
        self.assertEqual(
            metadata["weights"],
            {
                "within_day_total_score": 0.4,
                "across_weekday_total_score": 0.4,
                "entry_pressure_score": 0.1,
                "exit_pressure_score": 0.1,
            },
        )

    def test_looks_up_station_weekday_and_hour_from_od_profile(self) -> None:
        estimate = get_historical_crowd(
            "中山站",
            query_time="19:00",
            query_date="2026-07-24",
        )
        self.assertTrue(estimate["available"])
        self.assertEqual(estimate["source_station"], "中山")
        self.assertEqual(estimate["weekday_num"], 5)
        self.assertEqual(estimate["model_version"], "crowd_40_40_10_10_v1")
        self.assertEqual(estimate["crowd_score"], 93.92)
        self.assertEqual(estimate["crowd_level"], "非常擁擠")
        self.assertEqual(estimate["score_status"], "正常")
        self.assertEqual(estimate["reliability"], "low")
        self.assertGreaterEqual(estimate["crowd_score"], 0)
        self.assertLessEqual(estimate["crowd_score"], 100)


class RecommendationServiceTests(unittest.TestCase):
    def test_parses_coffee_air_conditioning_and_budget(self) -> None:
        intent = parse_recommendation_intent("可以和朋友喝咖啡聊天，而且有冷氣的地方，預算500以內")
        self.assertIn("咖啡", intent["categories"])
        self.assertIn("聊天", intent["categories"])
        self.assertIn("冷氣", intent["features"])
        self.assertEqual(intent["budget_max"], 500)

    def test_returns_three_named_recommendations(self) -> None:
        intent = parse_recommendation_intent("可以和朋友喝咖啡聊天，而且有冷氣的地方，預算500以內")
        results = recommend_places(intent)
        self.assertEqual(len(results), 3)
        self.assertTrue(all(item["resolved_place"]["place_name"] for item in results))
        self.assertTrue(all(item["recommendation_reasons"] for item in results))
        self.assertTrue(all("nearby_merchants" in item for item in results))

    def test_external_factor_recommendation_exposes_score_components(self) -> None:
        intent = parse_recommendation_intent("想找不太擠、捷運方便的地方")
        intent["time"] = "17:30"
        results = recommend_places(
            intent,
            query_date="2026-08-15",
            weather_type="rain",
            enable_external_factors=True,
        )
        self.assertTrue(all(item["comfort"]["external_factors"]["enabled"] for item in results))
        for item in results:
            self.assertAlmostEqual(
                sum(item["component_scores"].values()),
                item["comfort_component_score"]
                + item["category_match_score"]
                + item["feature_match_score"]
                + item["budget_match_score"],
                places=2,
            )


class MerchantServiceTests(unittest.TestCase):
    def test_all_mock_merchants_are_easywallet_enabled(self) -> None:
        merchants = get_merchants()
        self.assertGreaterEqual(len(merchants), 12)
        self.assertTrue(all(merchant["easywallet_available"] for merchant in merchants))
        self.assertTrue(all("示意" in merchant["merchant_name"] for merchant in merchants))

    def test_finds_nearby_merchants_sorted_by_distance(self) -> None:
        merchants = find_nearby_merchants(25.0533, 121.5210)
        self.assertGreaterEqual(len(merchants), 2)
        distances = [merchant["distance_m"] for merchant in merchants]
        self.assertEqual(distances, sorted(distances))
        self.assertTrue(all(distance <= 700 for distance in distances))
        self.assertEqual(summarize_merchants(merchants)["total"], len(merchants))


class BalanceServiceTests(unittest.TestCase):
    def test_recommends_only_affordable_mock_merchants(self) -> None:
        recommendations = recommend_by_balance(100, limit=3)
        self.assertGreaterEqual(len(recommendations), 1)
        self.assertTrue(all(item["suggested_spend"] <= 100 for item in recommendations))
        self.assertTrue(all(item["estimated_remaining"] >= 0 for item in recommendations))


class TravelDecisionAgentTests(unittest.TestCase):
    def test_fallback_orchestrates_tools_and_returns_trace(self) -> None:
        result = TravelDecisionAgent(GeminiTravelAdapter(api_key="")).run(
            "想和朋友喝咖啡聊天，有冷氣，預算500以內"
        )
        self.assertEqual(result["agent_name"], "Travel Decision Agent")
        self.assertFalse(result["llm_enabled"])
        self.assertEqual(len(result["recommendations"]), 3)
        self.assertGreaterEqual(len(result["workflow_trace"]), 6)
        self.assertTrue(any(step["tool"] == "Merchant Search Tool" for step in result["workflow_trace"]))
        self.assertIn(result["recommendations"][0]["resolved_place"]["place_name"], result["personalized_summary"])

    def test_agent_passes_external_factor_context_to_recommendations(self) -> None:
        result = TravelDecisionAgent(GeminiTravelAdapter(api_key="")).run(
            "想避開人潮",
            query_date="2026-08-15",
            query_time="17:30",
            weather_type="rain",
            enable_external_factors=True,
        )
        self.assertEqual(result["external_factor_context"]["query_date"], "2026-08-15")
        self.assertEqual(result["external_factor_context"]["query_time"], "17:30")
        self.assertTrue(result["external_factor_context"]["enabled"])
        self.assertTrue(all(
            item["comfort"]["external_factors"]["enabled"]
            for item in result["recommendations"]
        ))

    def test_gemini_function_call_executes_local_recommendation_tool(self) -> None:
        responses = iter([
            {"candidates": [{"content": {"role": "model", "parts": [{"functionCall": {
                "name": "find_recommended_places",
                "args": {
                    "categories": ["咖啡", "聊天"], "features": ["冷氣", "適合久坐"],
                    "budget_max": 500, "time": "15:00", "crowd_preference": "any",
                },
            }}]}}]},
            {"candidates": [{"content": {"role": "model", "parts": [
                {"text": "首選是中山站咖啡商圈，最近為中山站；舒適度為低可靠度的歷史OD推估。"}
            ]}}]},
        ])
        adapter = GeminiTravelAdapter(api_key="test-key", transport=lambda _: next(responses))
        result = TravelDecisionAgent(adapter).run("想找有冷氣、可聊天的咖啡廳，預算 500 元內")

        self.assertTrue(result["llm_enabled"])
        self.assertEqual(result["agent_mode"], "gemini_function_calling")
        self.assertEqual(result["structured_intent"]["budget_max"], 500)
        self.assertEqual(len(result["recommendations"]), 3)
        self.assertIn("nearby_merchants", result["recommendations"][0])
        self.assertIn("歷史OD推估", result["personalized_summary"])


if __name__ == "__main__":
    unittest.main()
