import unittest
from unittest.mock import patch

from app.main import (
    analyze_place,
    balance_recommend,
    health_check,
    list_merchants,
    list_places,
    list_stations,
    recommend,
    roaming_report,
    station_trend,
)
from app.schemas import (
    BalanceRecommendationRequest,
    PlaceAnalysisRequest,
    RecommendationRequest,
    RoamingReportRequest,
)


class ApiContractTests(unittest.TestCase):
    def test_health_contract(self) -> None:
        result = health_check()
        self.assertEqual(result["status"], "ok")

    def test_roaming_report_has_safe_local_fallback(self) -> None:
        with patch.dict("os.environ", {"GEMINI_API_KEY": ""}):
            result = roaming_report(
                RoamingReportRequest(language="en", district="Dadaocheng", station="Beimen")
            )
        self.assertEqual(result["source"], "LOCAL_TEMPLATE")
        self.assertIn("Dadaocheng", result["title"])
        self.assertIn("Beimen", result["story"])

    def test_place_analysis_includes_station_comfort_and_merchants(self) -> None:
        result = analyze_place(
            PlaceAnalysisRequest(
                place="中山站咖啡商圈",
                date="2026-07-24",
                time="19:00",
            )
        )
        self.assertIn("HISTORICAL OD", result["data_label"])
        self.assertIn("station_name", result["nearest_station"])
        self.assertIn("station_name_en", result["nearest_station"])
        self.assertIn("comfort_score", result["comfort"])
        self.assertFalse(result["comfort"]["external_factors"]["enabled"])
        self.assertEqual(
            result["comfort"]["historical_crowd_score"],
            result["comfort"]["adjusted_crowd_score"],
        )
        self.assertEqual(result["comfort"]["crowd_estimate"]["reliability"], "low")
        self.assertGreaterEqual(len(result["nearby_merchants"]), 1)

    def test_place_analysis_can_apply_prototype_external_factors(self) -> None:
        result = analyze_place(
            PlaceAnalysisRequest(
                place="台北小巨蛋",
                date="2026-08-15",
                time="17:30",
                weather_type="rain",
                enable_external_factors=True,
            )
        )
        comfort = result["comfort"]
        self.assertTrue(comfort["external_factors"]["enabled"])
        self.assertEqual(comfort["external_factors"]["date"]["coefficient"], 1.0)
        self.assertTrue(comfort["external_factors"]["event"]["matched_events"])
        self.assertNotEqual(
            comfort["historical_crowd_score"],
            comfort["adjusted_crowd_score"],
        )
        self.assertEqual(
            comfort["personalized_comfort_score"],
            comfort["comfort_score"],
        )

    def test_station_endpoint_contract_uses_historical_od(self) -> None:
        result = list_stations(time="19:00", date="2026-07-24")
        self.assertIn("HISTORICAL OD", result["data_label"])
        self.assertEqual(result["model_version"], "crowd_40_40_10_10_v1")
        self.assertEqual(len(result["stations"]), 119)
        self.assertTrue(all(item["station_name_en"] for item in result["stations"]))
        self.assertTrue(all(item["crowd_reliability"] == "low" for item in result["stations"]))
        self.assertTrue(all(item["crowd_index"] is not None for item in result["stations"]))
        self.assertTrue(all(0 <= item["crowd_index"] <= 100 for item in result["stations"]))

    def test_station_trend_returns_full_day_without_inventing_missing_hours(self) -> None:
        result = station_trend("R11-G14", date="2026-07-24")
        self.assertIn("HISTORICAL OD", result["data_label"])
        self.assertEqual(result["station"]["station_id"], "R11-G14")
        self.assertEqual(result["query_date"], "2026-07-24")
        self.assertEqual(len(result["points"]), 24)
        self.assertTrue(result["points"][19]["available"])
        self.assertIsNotNone(result["points"][19]["crowd_score"])
        self.assertFalse(result["points"][3]["available"])
        self.assertIsNone(result["points"][3]["crowd_score"])

    def test_place_catalog_includes_localized_names(self) -> None:
        result = list_places()
        self.assertTrue(all(item["place_name_en"] for item in result["places"]))
        self.assertTrue(all(item["place_name_ja"] for item in result["places"]))
        self.assertTrue(all(item["place_name_ko"] for item in result["places"]))

    def test_rules_recommendation_returns_top_three_contract(self) -> None:
        result = recommend(RecommendationRequest(prompt="想喝咖啡聊天，有冷氣，預算500元內"))
        self.assertEqual(len(result["recommendations"]), 3)
        self.assertTrue(all(item["resolved_place"]["place_name"] for item in result["recommendations"]))

    def test_rules_recommendation_accepts_date_weather_and_external_flag(self) -> None:
        result = recommend(
            RecommendationRequest(
                prompt="想避開人潮",
                date="2026-08-15",
                time="17:30",
                weather_type="rain",
                enable_external_factors=True,
            )
        )
        self.assertTrue(all(
            item["comfort"]["external_factors"]["enabled"]
            for item in result["recommendations"]
        ))
        self.assertTrue(all("component_scores" in item for item in result["recommendations"]))

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
