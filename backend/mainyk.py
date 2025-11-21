from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from delay_severity_model import SimpleFlightDelayModel

# Create API app
app = FastAPI(title="Flight Delay Prediction API")

# Allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model class
model = SimpleFlightDelayModel()

# Request body structure
class FlightInput(BaseModel):
    Airline: str
    Departure_Airport: str
    Arrival_Airport: str
    Flight_Status: str
    Departure_Time: str


@app.get("/")
def home():
    return {"message": "Flight Delay Prediction API is running."}


@app.post("/predict")
def predict_delay(data: FlightInput):
    """
    Accepts flight input data and returns prediction + probabilities.
    """
    try:
        result = model.predict(data.model_dump())
        return result

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
