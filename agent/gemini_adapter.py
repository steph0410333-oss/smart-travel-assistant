import json
import os
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv

from services.intent_service import CATEGORY_KEYWORDS, FEATURE_KEYWORDS, parse_recommendation_intent


class GeminiUnavailableError(RuntimeError):
    """Gemini 無法使用時，讓上層安全切回規則式推薦。"""


class GeminiTravelAdapter:
    """透過 Gemini function calling，把自然語言需求交給本機推薦工具。"""

    TOOL_NAME = "find_recommended_places"

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        transport: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
    ) -> None:
        load_dotenv()
        self.api_key = api_key if api_key is not None else os.getenv("GEMINI_API_KEY", "").strip()
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
        self._transport = transport

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    def plan(self, prompt: str) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
        if not self.configured:
            raise GeminiUnavailableError("尚未設定 Gemini API key")

        payload = {
            "systemInstruction": {"parts": [{"text": (
                "你是台北智慧出行小幫手的 Travel Decision Agent。"
                "請理解使用者的地點類型、環境條件、預算、時間與避開人潮偏好，"
                "並且一定要呼叫 find_recommended_places。"
                "資料僅為 Prototype 模擬資料，不得宣稱為即時官方資訊。"
            )}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "tools": [{"functionDeclarations": [self._tool_declaration()]}],
            "toolConfig": {"functionCallingConfig": {
                "mode": "ANY", "allowedFunctionNames": [self.TOOL_NAME]
            }},
            "generationConfig": {"temperature": 0.1},
        }
        response = self._request(payload)
        candidate_content = self._candidate_content(response)
        function_call = self._function_call(candidate_content)
        intent = self._validated_intent(prompt, function_call.get("args", {}))
        return intent, candidate_content, function_call

    def compose(
        self,
        prompt: str,
        candidate_content: dict[str, Any],
        function_call: dict[str, Any],
        recommendations: list[dict[str, Any]],
    ) -> str:
        compact_results = [
            {
                "排名": index + 1,
                "地點": item["resolved_place"]["place_name"],
                "最近捷運站": item["nearest_station"]["station_name"],
                "舒適度": item["comfort"]["comfort_score"],
                "舒適狀態": item["comfort"]["status"],
                "典型預算": item["resolved_place"]["typical_budget"],
                "推薦理由": item["recommendation_reasons"][:3],
                "附近悠遊付模擬商家": [
                    merchant["merchant_name"] for merchant in item.get("nearby_merchants", [])[:3]
                ],
            }
            for index, item in enumerate(recommendations)
        ]
        function_response: dict[str, Any] = {
            "name": self.TOOL_NAME,
            "response": {"recommendations": compact_results, "data_label": "MOCK / SIMULATED DATA"},
        }
        if function_call.get("id"):
            function_response["id"] = function_call["id"]

        payload = {
            "systemInstruction": {"parts": [{"text": (
                "根據工具結果，用繁體中文寫 2 到 3 句精簡、具體的建議。"
                "必須說出第一名地點與最近捷運站，也要提到舒適度是模擬評分。"
                "若工具有回傳附近悠遊付模擬商家，請挑一間作為順路參考並說明那是 Mock 資料。"
                "不可自行增加工具結果沒有的店家或即時資訊。"
            )}]},
            "contents": [
                {"role": "user", "parts": [{"text": prompt}]},
                candidate_content,
                {"role": "user", "parts": [{"functionResponse": function_response}]},
            ],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 240},
        }
        response = self._request(payload)
        text = self._response_text(response).strip()
        if not text:
            raise GeminiUnavailableError("Gemini 未產生推薦說明")
        return text

    def _request(self, payload: dict[str, Any]) -> dict[str, Any]:
        if self._transport is not None:
            return self._transport(payload)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        request = Request(
            url,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": self.api_key},
            method="POST",
        )
        try:
            with urlopen(request, timeout=18) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            if error.code in {401, 403}:
                reason = "Gemini API key 無效或沒有權限"
            elif error.code == 429:
                reason = "Gemini 免費額度或呼叫頻率已達上限"
            else:
                reason = f"Gemini API 暫時無法使用（HTTP {error.code}）"
            raise GeminiUnavailableError(reason) from error
        except (URLError, TimeoutError, json.JSONDecodeError) as error:
            raise GeminiUnavailableError("目前無法連線到 Gemini") from error

    @staticmethod
    def _candidate_content(response: dict[str, Any]) -> dict[str, Any]:
        try:
            return response["candidates"][0]["content"]
        except (KeyError, IndexError, TypeError) as error:
            raise GeminiUnavailableError("Gemini 回應格式不完整") from error

    def _function_call(self, content: dict[str, Any]) -> dict[str, Any]:
        for part in content.get("parts", []):
            call = part.get("functionCall")
            if call and call.get("name") == self.TOOL_NAME:
                return call
        raise GeminiUnavailableError("Gemini 沒有呼叫推薦工具")

    @staticmethod
    def _response_text(response: dict[str, Any]) -> str:
        content = GeminiTravelAdapter._candidate_content(response)
        return "".join(part.get("text", "") for part in content.get("parts", []))

    @staticmethod
    def _validated_intent(prompt: str, args: dict[str, Any]) -> dict[str, Any]:
        fallback = parse_recommendation_intent(prompt)
        categories = [value for value in args.get("categories", []) if value in CATEGORY_KEYWORDS]
        features = [value for value in args.get("features", []) if value in FEATURE_KEYWORDS]
        budget = args.get("budget_max")
        if not isinstance(budget, int) or not 0 < budget <= 100000:
            budget = fallback["budget_max"]
        query_time = args.get("time")
        if not isinstance(query_time, str) or len(query_time) != 5 or query_time[2] != ":":
            query_time = fallback["time"]
        crowd_preference = args.get("crowd_preference")
        if crowd_preference not in {"low", "any"}:
            crowd_preference = fallback["crowd_preference"]
        return {
            "original_prompt": prompt,
            "categories": categories or fallback["categories"],
            "features": features or fallback["features"],
            "budget_max": budget,
            "time": query_time,
            "crowd_preference": crowd_preference,
        }

    @staticmethod
    def _tool_declaration() -> dict[str, Any]:
        return {
            "name": GeminiTravelAdapter.TOOL_NAME,
            "description": "依照需求搜尋 Prototype 地點，計算最近捷運站的模擬人流舒適度、查詢附近悠遊付 Mock 商家並排序 Top 3。",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "categories": {"type": "ARRAY", "items": {"type": "STRING", "enum": list(CATEGORY_KEYWORDS)}, "description": "使用者想進行的活動類型，可複選。"},
                    "features": {"type": "ARRAY", "items": {"type": "STRING", "enum": list(FEATURE_KEYWORDS)}, "description": "使用者需要的環境條件，可複選。"},
                    "budget_max": {"type": "INTEGER", "description": "每人最高預算（新台幣）；未提及則省略。"},
                    "time": {"type": "STRING", "description": "預計前往時間，24 小時制 HH:MM；未提及用 15:00。"},
                    "crowd_preference": {"type": "STRING", "enum": ["low", "any"], "description": "想避開人潮用 low，否則用 any。"},
                },
                "required": ["categories", "features", "time", "crowd_preference"],
            },
        }
