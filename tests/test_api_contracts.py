import unittest

from app.main import analyze_place, balance_recommend, health_check, list_merchants, recommend
from app.schemas import BalanceRecommendationRequest, PlaceAnalysisRequest, RecommendationRequest


class ApiContractTests(unittest.TestCase):
    def test_health_contract(self) -> None:
        result = health_check()
        self.assertEqual(result["status"], "ok")

    def test_place_analysis_includes_station_comfort_and_merchants(self) -> None:
        result = analyze_place(PlaceAnalysisRequest(place="中山站咖啡商圈", time="19:00"))
        self.assertEqual(result["data_label"], "SIMULATED DATA / PROTOTYPE LOGIC")
        self.assertIn("station_name", result["nearest_station"])
        self.assertIn("comfort_score", result["comfort"])
        self.assertGreaterEqual(len(result["nearby_merchants"]), 1)

    def test_rules_recommendation_returns_top_three_contract(self) -> None:
        result = recommend(RecommendationRequest(prompt="想喝咖啡聊天，有冷氣，預算500元內"))
        self.assertEqual(len(result["recommendations"]), 3)
        self.assertTrue(all(item["resolved_place"]["place_name"] for item in result["recommendations"]))

    def test_merchant_endpoint_contract(self) -> None:
        result = list_merchants(latitude=25.0533, longitude=121.5210, radius_m=700)
        self.assertIn("MOCK", result["data_label"])
        self.assertEqual(result["summary"]["total"], len(result["merchants"]))

    def test_balance_recommendation_is_affordable_and_labeled_mock(self) -> None:
        result = balance_recommend(BalanceRecommendationRequest(balance=200, limit=3))
        self.assertIn("MOCK BALANCE", result["data_label"])
        self.assertGreaterEqual(len(result["recommendations"]), 1)
        self.assertTrue(
            all(item["suggested_spend"] <= result["balance"] for item in result["recommendations"])
        )


if __name__ == "__main__":
    unittest.main()

