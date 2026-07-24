import unittest

from agent.gemini_adapter import GeminiTravelAdapter
from agent.travel_decision_agent import TravelDecisionAgent
from services.comfort_service import analyze_station_comfort
from services.crowd_service import get_historical_crowd
from services.balance_service import recommend_by_balance
from services.intent_service import parse_recommendation_intent
from services.merchant_service import find_nearby_merchants, get_merchants, summarize_merchants
from services.recommendation_service import recommend_places
from services.station_service import find_nearest_station, get_stations, resolve_place


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
            "hour": 19,
            "data_period_start": "2026-06-01",
            "data_period_end": "2026-06-30",
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


class CrowdServiceTests(unittest.TestCase):
    def test_looks_up_station_weekday_and_hour_from_od_profile(self) -> None:
        estimate = get_historical_crowd(
            "中山站",
            query_time="19:00",
            query_date="2026-07-24",
        )
        self.assertTrue(estimate["available"])
        self.assertEqual(estimate["source_station"], "中山")
        self.assertEqual(estimate["weekday_num"], 5)
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
