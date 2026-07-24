from typing import Any

from agent.gemini_adapter import GeminiTravelAdapter, GeminiUnavailableError
from services.intent_service import parse_recommendation_intent
from services.recommendation_service import recommend_places


class TravelDecisionAgent:
    """由 Gemini 選擇並呼叫本機推薦工具，失敗時安全切回規則式流程。"""

    def __init__(self, gemini: GeminiTravelAdapter | None = None) -> None:
        self.gemini = gemini or GeminiTravelAdapter()

    def run(self, prompt: str) -> dict[str, Any]:
        trace: list[dict[str, Any]] = []

        gemini_error = None
        gemini_context = None
        if self.gemini.configured:
            try:
                intent, candidate_content, function_call = self.gemini.plan(prompt)
                gemini_context = (candidate_content, function_call)
                mode = "gemini_function_calling"
                llm_enabled = True
            except GeminiUnavailableError as error:
                gemini_error = str(error)
                intent = parse_recommendation_intent(prompt)
                mode = "deterministic_fallback"
                llm_enabled = False
        else:
            intent = parse_recommendation_intent(prompt)
            mode = "deterministic_fallback"
            llm_enabled = False
        trace.append(
            {
                "step": 1,
                "tool": "Gemini Intent Planner" if llm_enabled else "Intent Parser (Fallback)",
                "status": "completed",
                "summary": self._intent_summary(intent) + (f"；已切換備援：{gemini_error}" if gemini_error else ""),
            }
        )

        recommendations = recommend_places(intent, limit=3)
        trace.append(
            {
                "step": 2,
                "tool": "Place Candidate Tool",
                "status": "completed",
                "summary": "從 Mock 地點目錄建立候選地點",
            }
        )
        trace.append(
            {
                "step": 3,
                "tool": "Crowd & Comfort Tools",
                "status": "completed",
                "summary": "查詢最近捷運站並計算各候選地點舒適度",
            }
        )
        trace.append(
            {
                "step": 4,
                "tool": "Merchant Search Tool",
                "status": "completed",
                "summary": "查詢各候選地點 700 公尺內可使用悠遊付的 Mock 商家與優惠",
            }
        )
        trace.append(
            {
                "step": 5,
                "tool": "Recommendation Ranking Tool",
                "status": "completed",
                "summary": "依需求符合度、預算與舒適度排序 Top 3",
            }
        )

        if gemini_context is not None:
            try:
                summary = self.gemini.compose(prompt, *gemini_context, recommendations)
            except GeminiUnavailableError as error:
                summary = self._compose_summary(recommendations, intent)
                gemini_error = str(error)
                mode = "gemini_tool_call_with_fallback_summary"
        else:
            summary = self._compose_summary(recommendations, intent)
        trace.append(
            {
                "step": 6,
                "tool": "Gemini Response Composer" if gemini_context is not None and not gemini_error else "Response Composer (Fallback)",
                "status": "completed",
                "summary": "產生可顯示於 UI 的繁體中文建議",
            }
        )

        return {
            "agent_name": "Travel Decision Agent",
            "agent_mode": mode,
            "llm_enabled": llm_enabled,
            "model": self.gemini.model if llm_enabled else None,
            "data_label": (
                "GEMINI AGENT + HISTORICAL OD CROWD ESTIMATE"
                if llm_enabled
                else "HISTORICAL OD CROWD ESTIMATE / RULES-BASED AGENT FALLBACK"
            ),
            "structured_intent": intent,
            "recommendations": recommendations,
            "personalized_summary": summary,
            "workflow_trace": trace,
            "limitations": (
                f"Gemini 無法完成全部流程，已自動使用規則式備援：{gemini_error}。"
                if gemini_error
                else "Gemini 負責理解需求與撰寫說明；人流為低可靠度的歷史OD推估，並非即時站內人數。"
                if llm_enabled
                else "未設定 Gemini API key，意圖解析與說明使用可測試的規則式備援。"
            ),
        }

    @staticmethod
    def _intent_summary(intent: dict[str, Any]) -> str:
        parts = []
        if intent["categories"]:
            parts.append("活動：" + "、".join(intent["categories"]))
        if intent["features"]:
            parts.append("條件：" + "、".join(intent["features"]))
        if intent["budget_max"] is not None:
            parts.append(f"預算：{intent['budget_max']} 元內")
        return "；".join(parts) or "未辨識到明確條件，使用舒適度作為主要排序依據"

    @staticmethod
    def _compose_summary(recommendations: list[dict[str, Any]], intent: dict[str, Any]) -> str:
        if not recommendations:
            return "目前沒有符合條件的 Mock 地點。"
        first = recommendations[0]
        place_name = first["resolved_place"]["place_name"]
        station_name = first["nearest_station"]["station_name"]
        reasons = "、".join(first["recommendation_reasons"][:2])
        budget_text = f"，符合 {intent['budget_max']} 元內預算" if intent["budget_max"] else ""
        merchant_count = first.get("merchant_summary", {}).get("total", 0)
        merchant_text = f"；附近另有 {merchant_count} 間悠遊付 Mock 商家可比較" if merchant_count else ""
        return f"首選是{place_name}，最近為{station_name}。{reasons}{budget_text}{merchant_text}。其他選擇可在下方 Top 3 卡片比較。"
