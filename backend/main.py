from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator

app = FastAPI(title="Assignment 3 Flight Delay API")

# Allow React (running on a different port) to call FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # later you can restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Request & Response Models ----------

class PredictionRequest(BaseModel):
    carrier: str = Field(..., description="Airline code, e.g. '9E'")
    airport: str = Field(..., description="Airport code, e.g. 'ABE'")
    month: int = Field(..., ge=1, le=12)
    weather_delay_count: float = Field(..., ge=0)
    carrier_delay_count: float = Field(..., ge=0)
    late_aircraft_count: float = Field(..., ge=0)
    cancelled_flights: float = Field(..., ge=0)

    @validator("carrier", "airport")
    def strip_upper(cls, v):
        return v.strip().upper()


class PredictionResponse(BaseModel):
    message: str
    # placeholders – later we’ll replace with real model output
    high_weather_risk: bool
    total_delay_minutes: float
    delay_category: str


# ---------- ROUTES ----------

# 1) Simple GET route (for health check)
@app.get("/health")
def health_check():
    return {"status": "ok", "detail": "FastAPI is running"}


# 2) POST route for predictions (required by assignment)
@app.post("/predict", response_model=PredictionResponse)
def predict_delay(payload: PredictionRequest):
    try:
        # TODO: here we will call your real ML models

        # For now, we just return some dummy values so we can test the flow
        return PredictionResponse(
            message="Dummy prediction (no model yet)",
            high_weather_risk=payload.weather_delay_count > 10,
            total_delay_minutes=payload.carrier_delay_count
                                + payload.late_aircraft_count
                                + payload.cancelled_flights * 30,
            delay_category="Minor",
        )
    except Exception as e:
        # generic error handling
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")