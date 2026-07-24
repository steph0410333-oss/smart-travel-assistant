from pydantic import BaseModel, Field


class PlaceAnalysisRequest(BaseModel):
    place: str = Field(min_length=1, examples=["台北小巨蛋"])
    date: str | None = Field(default=None, examples=["2026-07-24"])
    time: str | None = Field(default=None, examples=["19:00"])
    preferences: list[str] = Field(default_factory=list)


class RecommendationRequest(BaseModel):
    prompt: str = Field(
        min_length=3,
        examples=["可以和朋友喝咖啡聊天，而且有冷氣的地方，預算500以內"],
    )


class BalanceRecommendationRequest(BaseModel):
    balance: int = Field(ge=0, le=10000, examples=[300])
    limit: int = Field(default=3, ge=1, le=10)
