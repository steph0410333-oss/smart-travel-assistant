from pydantic import BaseModel, Field


class PlaceAnalysisRequest(BaseModel):
    place: str = Field(min_length=1, examples=["台北小巨蛋"])
    date: str | None = Field(
        default=None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        examples=["2026-07-24"],
    )
    time: str | None = Field(
        default=None,
        pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$",
        examples=["19:00"],
    )
    preferences: list[str] = Field(default_factory=list)
    weather_type: str | None = Field(
        default=None,
        pattern=r"^(sunny|rain|heavy_rain)$",
        examples=["rain"],
    )
    enable_external_factors: bool = False


class RecommendationRequest(BaseModel):
    prompt: str = Field(
        min_length=3,
        examples=["可以和朋友喝咖啡聊天，而且有冷氣的地方，預算500以內"],
    )
    date: str | None = Field(
        default=None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        examples=["2026-08-15"],
    )
    time: str | None = Field(
        default=None,
        pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$",
        examples=["17:30"],
    )
    weather_type: str | None = Field(
        default=None,
        pattern=r"^(sunny|rain|heavy_rain)$",
        examples=["rain"],
    )
    enable_external_factors: bool = False


class BalanceRecommendationRequest(BaseModel):
    balance: int = Field(ge=0, le=10000, examples=[300])
    limit: int = Field(default=3, ge=1, le=10)


class RoamingReportRequest(BaseModel):
    language: str = Field(default="zh-Hant", pattern="^(zh-Hant|en|ja|ko)$")
    district: str = Field(min_length=1, max_length=40)
    station: str = Field(min_length=1, max_length=60)
