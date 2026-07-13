from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from agent.travel_decision_agent import TravelDecisionAgent
from app.schemas import BalanceRecommendationRequest, PlaceAnalysisRequest, RecommendationRequest
from services.balance_service import recommend_by_balance
from services.comfort_service import analyze_station_comfort
from services.intent_service import parse_recommendation_intent
from services.merchant_service import find_nearby_merchants, get_merchants, summarize_merchants
from services.recommendation_service import recommend_places
from services.station_service import find_nearest_station, get_places, get_stations, resolve_place


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(title="智慧出行小幫手 Prototype")
travel_decision_agent = TravelDecisionAgent()
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", include_in_schema=False)
def home() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "project": "smart-travel-assistant"}


@app.get("/api/stations")
def list_stations() -> dict:
    return {
        "data_label": "SIMULATED DATA",
        "stations": get_stations(),
    }


@app.get("/api/places")
def list_places() -> dict:
    places = []
    for place in get_places():
        nearest_station = find_nearest_station(place["latitude"], place["longitude"])
        places.append(
            {
                **place,
                "nearest_station": nearest_station["station_name"],
                "station_distance_m": nearest_station["distance_m"],
            }
        )
    return {"data_label": "MOCK DATA", "places": places}


@app.get("/api/merchants")
def list_merchants(
    latitude: float | None = None,
    longitude: float | None = None,
    radius_m: int = 700,
) -> dict:
    if (latitude is None) != (longitude is None):
        raise HTTPException(status_code=400, detail="latitude 與 longitude 必須一起提供")
    merchants = (
        find_nearby_merchants(latitude, longitude, max(100, min(radius_m, 3000)), limit=50)
        if latitude is not None and longitude is not None
        else get_merchants()
    )
    return {
        "data_label": "MOCK EASYWALLET MERCHANT DATA / PROTOTYPE ONLY",
        "merchants": merchants,
        "summary": summarize_merchants(merchants),
    }


@app.post("/api/balance-recommend")
def balance_recommend(request: BalanceRecommendationRequest) -> dict:
    recommendations = recommend_by_balance(request.balance, request.limit)
    return {
        "data_label": "MOCK BALANCE / MOCK EASYWALLET MERCHANT DATA / PROTOTYPE ONLY",
        "currency": "TWD",
        "balance": request.balance,
        "recommendations": recommendations,
        "disclaimer": "未連接真實悠遊卡或悠遊付帳戶，餘額、價格與商家皆為 Prototype 模擬資料。",
    }


@app.post("/api/analyze-place")
def analyze_place(request: PlaceAnalysisRequest) -> dict:
    place = resolve_place(request.place)
    if place is None:
        raise HTTPException(
            status_code=404,
            detail="目前 Prototype 找不到這個地點。請從建議清單選擇；未來會串接正式地點 API。",
        )

    nearest_station = find_nearest_station(place["latitude"], place["longitude"])
    comfort = analyze_station_comfort(
        nearest_station,
        query_time=request.time,
        preferences=request.preferences,
        station_distance_m=nearest_station["distance_m"],
    )
    nearby_merchants = find_nearby_merchants(place["latitude"], place["longitude"])
    return {
        "data_label": "SIMULATED DATA / PROTOTYPE LOGIC",
        "query": request.model_dump(),
        "resolved_place": place,
        "nearest_station": nearest_station,
        "comfort": comfort,
        "nearby_merchants": nearby_merchants,
        "merchant_summary": summarize_merchants(nearby_merchants),
    }


@app.post("/api/recommend")
def recommend(request: RecommendationRequest) -> dict:
    intent = parse_recommendation_intent(request.prompt)
    recommendations = recommend_places(intent, limit=3)
    return {
        "data_label": "MOCK DATA / RULES-BASED RECOMMENDATION",
        "structured_intent": intent,
        "recommendations": recommendations,
    }


@app.post("/api/agent/recommend")
def agent_recommend(request: RecommendationRequest) -> dict:
    return travel_decision_agent.run(request.prompt)

