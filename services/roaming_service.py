import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


FALLBACK_COPY = {
    "zh-Hant": (
        "{district}週末漫遊",
        "小悠本週從{station}出發，虛擬探索了{district}。下次來台灣時，要不要一起完成這個城市任務？",
    ),
    "en": (
        "A weekend in {district}",
        "Xiao-You virtually explored {district} from {station} this week. "
        "Would you like to complete this city mission together on your next Taiwan trip?",
    ),
    "ja": (
        "{district}週末漫遊",
        "小悠は今週、{station}から{district}をバーチャル散策しました。次の台湾旅行で一緒に街ミッションを達成しませんか？",
    ),
    "ko": (
        "{district} 주말 로밍",
        "샤오유는 이번 주 {station}에서 출발해 {district} 지역을 가상으로 여행했어요. 다음 대만 여행에서 함께 도시 미션을 완료할까요?",
    ),
}


def generate_roaming_report(language: str, district: str, station: str) -> dict[str, str]:
    title_template, story_template = FALLBACK_COPY.get(language, FALLBACK_COPY["en"])
    fallback = {
        "title": title_template.format(district=district),
        "story": story_template.format(district=district, station=station),
        "source": "LOCAL_TEMPLATE",
    }
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return fallback

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    prompt = (
        "Write a warm weekly virtual travel postcard for a digital companion. "
        f"Language: {language}. District: {district}. Starting point: {station}. "
        "This is fictional roaming, not the user's real location. "
        'Return JSON only: {"title":"max 28 chars","story":"max 110 chars"}.'
    )
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 160,
            "responseMimeType": "application/json",
        },
    }
    request = Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )
    try:
        with urlopen(request, timeout=12) as response:
            result = json.loads(response.read().decode("utf-8"))
        text = result["candidates"][0]["content"]["parts"][0]["text"]
        generated = json.loads(text)
        title = str(generated.get("title", "")).strip()
        story = str(generated.get("story", "")).strip()
        if title and story:
            return {"title": title, "story": story, "source": "GEMINI_AI"}
    except (HTTPError, URLError, TimeoutError, KeyError, IndexError, TypeError, json.JSONDecodeError):
        pass
    return fallback
