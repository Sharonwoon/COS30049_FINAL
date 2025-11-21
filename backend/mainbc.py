from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import joblib # <--- Import joblib
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GLOBAL STORAGE ---
MODEL_CONTEXT = {
    "pipeline": None,
    "avg_df": None,
    "threshold": None,
    "carriers": [],
    "airports": []
}

class FlightRequest(BaseModel):
    year: int
    month: int
    carrier: str
    airport: str

# --- HELPER FUNCTIONS ---
def get_yearly_trend(carrier, airport, avg_df):
    route_data = avg_df[(avg_df['carrier'] == carrier) & (avg_df['airport'] == airport)].copy()
    trend_data = []
    for m in range(1, 13):
        month_stats = route_data[route_data['month'] == m]
        if not month_stats.empty:
            risk_val = month_stats.iloc[0]['WeatherDelayProportion']
            volume_val = month_stats.iloc[0]['TotalFlights']
        else:
            risk_val = 0
            volume_val = 0
        trend_data.append({"month": m, "risk_score": float(risk_val), "flight_volume": int(volume_val)})
    return trend_data

def get_competitor_analysis(current_carrier, airport, month, avg_df):
    competitors = avg_df[
        (avg_df['airport'] == airport) & 
        (avg_df['month'] == month) & 
        (avg_df['carrier'] != current_carrier)
    ].copy()
    
    if competitors.empty:
        return []

    competitors = competitors.sort_values('WeatherDelayProportion')
    results = []
    for _, row in competitors.head(3).iterrows(): 
        results.append({
            "carrier": row['carrier'],
            "risk_score": float(row['WeatherDelayProportion']),
            "flight_volume": int(row['TotalFlights'])
        })
    return results

# --- LOAD MODEL FUNCTION ---
@app.on_event("startup")
def load_model():
    pkl_path = "flight_model.pkl"
    
    if not os.path.exists(pkl_path):
        print("WARNING: flight_model.pkl not found!")
        print("Please run 'python train.py' to generate the model file.")
        return

    print(f"Loading model from {pkl_path}...")
    try:
        # Load the dictionary we saved in train.py
        model_package = joblib.load(pkl_path)
        
        MODEL_CONTEXT["pipeline"] = model_package["pipeline"]
        MODEL_CONTEXT["avg_df"] = model_package["avg_df"]
        MODEL_CONTEXT["threshold"] = model_package["threshold"]
        MODEL_CONTEXT["carriers"] = model_package["carriers"]
        MODEL_CONTEXT["airports"] = model_package["airports"]
        
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")

# --- ENDPOINTS ---

@app.get("/")
def home():
    if MODEL_CONTEXT["pipeline"] is None:
        return {"status": "API running, but MODEL NOT LOADED. Run train.py first."}
    return {"status": "Flight Risk API is running and Model is Loaded"}

@app.get("/options")
def get_form_options():
    if not MODEL_CONTEXT["carriers"]:
        raise HTTPException(status_code=503, detail="Model not loaded.")
    return {
        "carriers": MODEL_CONTEXT["carriers"],
        "airports": MODEL_CONTEXT["airports"]
    }

@app.post("/predict")
def predict_risk(request: FlightRequest):
    if MODEL_CONTEXT["pipeline"] is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    avg_df = MODEL_CONTEXT["avg_df"]
    pipeline = MODEL_CONTEXT["pipeline"]
    
    match = avg_df[(avg_df['carrier'] == request.carrier) & (avg_df['airport'] == request.airport) & (avg_df['month'] == request.month)]

    source = "Historical Match"
    if not match.empty:
        input_row = match.iloc[0]
        actual_hist_prop = input_row['WeatherDelayProportion']
    else:
        source = "Global Fallback"
        input_row = avg_df.mean(numeric_only=True)
        input_row['month'] = request.month
        input_row['carrier'] = request.carrier
        input_row['airport'] = request.airport
        actual_hist_prop = input_row['WeatherDelayProportion']

    input_data = pd.DataFrame([input_row]).drop(columns=['HighWeatherImpact_Class', 'WeatherDelayProportion'], errors='ignore')
    prediction = pipeline.predict(input_data)[0]
    probs = pipeline.predict_proba(input_data)[0]

    trend_data = get_yearly_trend(request.carrier, request.airport, avg_df)
    competitors = get_competitor_analysis(request.carrier, request.airport, request.month, avg_df)

    return {
        "risk_level": "HIGH RISK" if prediction == 1 else "LOW RISK",
        "risk_class": int(prediction),
        "confidence_high_risk": float(probs[1]),
        "confidence_low_risk": float(probs[0]),
        "data_source": source,
        "historical_weather_prop": float(actual_hist_prop),
        "threshold": float(MODEL_CONTEXT["threshold"]),
        "trend_data": trend_data,
        "competitors": competitors
    }