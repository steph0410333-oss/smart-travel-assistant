import re
from typing import Any


CATEGORY_KEYWORDS = {
    "咖啡": ["咖啡", "咖啡廳"],
    "聊天": ["聊天", "朋友", "聚會"],
    "聚餐": ["吃飯", "聚餐", "餐廳"],
    "散步": ["散步", "走走"],
    "展覽": ["展覽", "看展", "文創"],
    "購物": ["購物", "逛街"],
    "自然": ["自然", "公園", "戶外"],
    "約會": ["約會"],
}

FEATURE_KEYWORDS = {
    "冷氣": ["冷氣", "涼爽"],
    "室內": ["室內", "雨天"],
    "捷運方便": ["捷運", "交通方便"],
    "適合久坐": ["久坐", "聊天"],
}


def parse_recommendation_intent(prompt: str) -> dict[str, Any]:
    compact_prompt = "".join(prompt.split())
    categories = [
        category
        for category, keywords in CATEGORY_KEYWORDS.items()
        if any(keyword in compact_prompt for keyword in keywords)
    ]
    features = [
        feature
        for feature, keywords in FEATURE_KEYWORDS.items()
        if any(keyword in compact_prompt for keyword in keywords)
    ]

    budget_match = re.search(r"(?:預算)?\s*(\d{2,4})\s*(?:元|塊)?\s*(?:以內|以下|內)", prompt)
    budget_max = int(budget_match.group(1)) if budget_match else None

    if "晚上" in prompt or "今晚" in prompt:
        query_time = "19:00"
    elif "中午" in prompt:
        query_time = "12:00"
    elif "早上" in prompt or "上午" in prompt:
        query_time = "09:00"
    else:
        query_time = "15:00"

    crowd_preference = "low" if any(word in prompt for word in ["不擠", "人少", "避開人潮", "不要太多人"]) else "any"

    return {
        "original_prompt": prompt,
        "categories": categories,
        "features": features,
        "budget_max": budget_max,
        "time": query_time,
        "crowd_preference": crowd_preference,
    }
