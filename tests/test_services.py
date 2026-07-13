import unittest

from agent.gemini_adapter import GeminiTravelAdapter
from agent.travel_decision_agent import TravelDecisionAgent
from services.comfort_service import analyze_station_comfort
from services.intent_service import parse_recommendation_intent
from services.merchant_service import find_nearby_merchants, get_merchants, summarize_merchants
from services.recommendation_service import recommend_places
from services.station_service import find_nearest_station, resolve_place


class StationServiceTests(unittest.TestCase):
    def test_resolves_place_alias_and_finds_nearest_station(self) -> None:
        place = resolve_place("我想去小巨蛋")
        self.assertIsNotNone(place)
        station = find_nearest_station(place["latitude"], place["longitude"])
        self.assertEqual(station["station_name"], "台北小巨蛋站")
        self.assertLess(station["distance_m"], 300)


class ComfortServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.station = {
            "crowd_index": 50,
            "nearby_crowd_index": 45,
            "peak_index": 55,
            "event_flag": False,
        }

    def test_evening_peak_reduces_comfort(self) -> None:
        afternoon = analyze_station_comfort(self.station, "15:00")
        evening = analyze_station_comfort(self.station, "19:00")
        self.assertLess(evening["comfort_score"], afternoon["comfort_score"])

    def test_crowd_preference_adds_personalized_penalty(self) -> None:
        normal = analyze_station_comfort(self.station, "19:00")
        personalized = analyze_station_comfort(self.station, "19:00", ["不想太擠"])
        self.assertLess(personalized["comfort_score"], normal["comfort_score"])


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
                {"text": "首選是中山站咖啡商圈，最近為中山站；舒適度為模擬評分。"}
            ]}}]},
        ])
        adapter = GeminiTravelAdapter(api_key="test-key", transport=lambda _: next(responses))
        result = TravelDecisionAgent(adapter).run("想找有冷氣、可聊天的咖啡廳，預算 500 元內")

        self.assertTrue(result["llm_enabled"])
        self.assertEqual(result["agent_mode"], "gemini_function_calling")
        self.assertEqual(result["structured_intent"]["budget_max"], 500)
        self.assertEqual(len(result["recommendations"]), 3)
        self.assertIn("nearby_merchants", result["recommendations"][0])
        self.assertIn("模擬評分", result["personalized_summary"])


if __name__ == "__main__":
    unittest.main()
