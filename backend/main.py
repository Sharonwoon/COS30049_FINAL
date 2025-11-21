from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator

# If you later load ML model, import here:
# from weather_delay_prediction_model import load_model, predict

app = FastAPI(title="Assignment 3 Flight Delay API")

# Allow React to call FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    high_weather_risk: bool
    total_delay_minutes: float
    delay_category: str


# ---------- ROUTES ----------

@app.get("/health")
def health_check():
    return {"status": "ok", "detail": "FastAPI is running"}


@app.post("/predict", response_model=PredictionResponse)
def predict_delay(payload: PredictionRequest):
    try:
        # TODO: Replace with real ML model call later
        return PredictionResponse(
            message="Dummy prediction (no ML model yet)",
            high_weather_risk=payload.weather_delay_count > 10,
            total_delay_minutes=(
                payload.carrier_delay_count +
                payload.late_aircraft_count +
                payload.cancelled_flights * 30
            ),
            delay_category="Minor",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")
