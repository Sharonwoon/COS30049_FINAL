from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import joblib
import os

app = FastAPI(title="Unified Flight AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HELPER FUNCTIONS (These were missing!) ---

def get_yearly_trend(carrier, airport, avg_df):
    """Generates 12-month trend data for the Seasonal Chart."""
    if avg_df is None: return []
    
    # Filter for the specific route
    route_data = avg_df[(avg_df['carrier'] == carrier) & (avg_df['airport'] == airport)].copy()
    trend_data = []
    
    # Loop 1-12 to ensure every month has a value (even if 0)
    for m in range(1, 13):
        month_stats = route_data[route_data['month'] == m]
        if not month_stats.empty:
            risk_val = month_stats.iloc[0]['WeatherDelayProportion']
            volume_val = month_stats.iloc[0]['TotalFlights']
        else:
            risk_val = 0
            volume_val = 0
            
        trend_data.append({
            "month": m, 
            "risk_score": float(risk_val), 
            "flight_volume": int(volume_val)
        })
    return trend_data

def get_competitor_analysis(current_carrier, airport, month, avg_df):
    """Finds comparison data for the Radar Chart."""
    if avg_df is None: return []
    
    # Find other carriers at same airport/month
    competitors = avg_df[
        (avg_df['airport'] == airport) & 
        (avg_df['month'] == month) & 
        (avg_df['carrier'] != current_carrier)
    ].copy()
    
    if competitors.empty: return []

    # Sort by lowest risk
    competitors = competitors.sort_values('WeatherDelayProportion')
    
    results = []
    for _, row in competitors.head(3).iterrows(): 
        results.append({
            "carrier": row['carrier'],
            "risk_score": float(row['WeatherDelayProportion']),
            "flight_volume": int(row['TotalFlights'])
        })
    return results


# --- LOAD MODELS ---
MODELS = {}
@app.on_event("startup")
def load_models():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"📂 Loading models from: {base_dir}")
    
    # Chart 2 Model
    try:
        path = os.path.join(base_dir, "flight_model.pkl")
        if os.path.exists(path):
            pkg = joblib.load(path)
            MODELS["flight"] = pkg
            print("✅ Chart 2 Model Loaded")
        else:
            print("⚠️ flight_model.pkl not found")
    except Exception as e: print(f"⚠️ Chart 2 Model Error: {e}")

    # Chart 3 Model
    try:
        path = os.path.join(base_dir, "delay_severity_model.pkl")
        if os.path.exists(path):
            pkg = joblib.load(path)
            if isinstance(pkg, dict):
                MODELS["severity"] = pkg.get("model")
                MODELS["severity_encoders"] = pkg.get("encoders")
                
                # 🔍 PRINT VALID VALUES
                print("✅ Chart 3 Model Loaded")
                print("📋 Valid Flight_Status values:", list(pkg["encoders"]["status"].classes_))
                print("📋 Valid Airlines:", list(pkg["encoders"]["airline"].classes_))
                print("📋 Valid Departure Airports:", list(pkg["encoders"]["departure"].classes_))
                print("📋 Valid Arrival Airports:", list(pkg["encoders"]["arrival"].classes_))
            else:
                MODELS["severity"] = pkg
                MODELS["severity_encoders"] = {}
            print("✅ Chart 3 Model Loaded")
    except Exception as e: print(f"⚠️ Chart 3 Model Error: {e}")

    # Simple Model (Duration)
    try:
        path = os.path.join(base_dir, "simple_model.pkl")
        if os.path.exists(path):
            MODELS["simple"] = joblib.load(path)
            print("✅ Simple Model Loaded")
    except Exception as e: print(f"⚠️ Simple Model Error: {e}")


# --- SMART PREDICT ENDPOINT ---
@app.post("/predict")
async def smart_predict(request: Request):
    try:
        data = await request.json()
    except:
        raise HTTPException(400, "Invalid JSON")

    # --- CASE 1: CHART 1 (Prediction Tool / Calculator) ---
    if "weather_delay_count" in data:
        print("🔹 Handling Chart 1 Request")
        try:
            total_delay = (
                float(data.get('carrier_delay_count', 0)) +
                float(data.get('late_aircraft_count', 0)) +
                (float(data.get('cancelled_flights', 0)) * 30)
            )
            return {
                "message": "Calculation Success",
                "high_weather_risk": float(data.get('weather_delay_count', 0)) > 5,
                "total_delay_minutes": total_delay,
                "delay_category": "Major" if total_delay > 45 else "Minor"
            }
        except Exception as e:
            raise HTTPException(400, f"Calculation Error: {str(e)}")

    # --- CASE 2: CHART 2 (Seasonal Risk) ---
    elif "year" in data and "month" in data and MODELS.get("flight"):
        print("🔹 Handling Chart 2 Request")
        pkg = MODELS["flight"]
        avg_df = pkg["avg_df"]
        pipeline = pkg["pipeline"]
        threshold = pkg["threshold"]
        
        # 1. Look for exact historical match
        match = avg_df[
            (avg_df['carrier'] == data['carrier']) & 
            (avg_df['airport'] == data['airport']) & 
            (avg_df['month'] == data['month'])
        ]
        
        if not match.empty:
            row = match.iloc[0]
        else:
            # Fallback to average if no exact route/month found
            row = avg_df.mean(numeric_only=True)
            row['month'] = data['month']
            row['carrier'] = data['carrier']
            row['airport'] = data['airport']

        # 2. Make Prediction
        # We drop target columns so the model only sees features
        input_df = pd.DataFrame([row]).drop(columns=['HighWeatherImpact_Class', 'WeatherDelayProportion'], errors='ignore')
        
        try:
            pred = pipeline.predict(input_df)[0]
            probs = pipeline.predict_proba(input_df)[0]
        except Exception as e:
            print(f"Prediction Error: {e}")
            # Fallback if prediction fails (e.g. unseen carrier)
            pred = 0
            probs = [0.5, 0.5]

        # 3. GENERATE CHART DATA (The Fix)
        trend_data = get_yearly_trend(data['carrier'], data['airport'], avg_df)
        competitors = get_competitor_analysis(data['carrier'], data['airport'], data['month'], avg_df)

        return {
            "risk_level": "HIGH RISK" if pred == 1 else "LOW RISK",
            "risk_class": int(pred),
            "confidence_high_risk": float(probs[1]),
            "historical_weather_prop": float(row.get('WeatherDelayProportion', 0)),
            "threshold": float(threshold),
            "trend_data": trend_data,   # <--- Now filled with real data
            "competitors": competitors  # <--- Now filled with real data
        }

  # --- CASE 3: CHART 3 (Severity/Duration) ---
    elif "Airline" in data and MODELS.get("severity"):
        print("🔹 Handling Chart 3 Request")
        print(f"📥 Received data: {data}")
    
    try:
        # Get the model components
        model = MODELS["severity"]
        encoders = MODELS.get("severity_encoders", {})
        
        print(f"✅ Model loaded: {model is not None}")
        print(f"✅ Encoders loaded: {list(encoders.keys())}")
        
        # Load the full bundle to get scaler and feature order
        base_dir = os.path.dirname(os.path.abspath(__file__))
        bundle_path = os.path.join(base_dir, "delay_severity_model.pkl")
        print(f"📂 Loading bundle from: {bundle_path}")
        
        bundle = joblib.load(bundle_path)
        scaler = bundle["scaler"]
        feature_order = bundle["feature_order"]
        
        print(f"✅ Feature order: {feature_order}")
        
        # Parse datetime from input
        print(f"🕐 Parsing datetime: {data['Departure_Time']}")
        dt = pd.to_datetime(data["Departure_Time"], format="%d/%m/%Y %H:%M", errors="coerce")
        
        if pd.isna(dt):
            print("❌ DateTime parsing failed!")
            raise HTTPException(400, f"Invalid Departure_Time format. Received: {data['Departure_Time']}")
        
        print(f"✅ Parsed datetime: {dt}")
        
        # Encode categorical features
        print("🔄 Encoding features...")
        try:
            print(f"  Airline: {data['Airline']}")
            airline_enc = encoders["airline"].transform([data["Airline"]])[0]
            print(f"  ✅ Airline encoded: {airline_enc}")
            
            print(f"  Departure: {data['Departure_Airport']}")
            departure_enc = encoders["departure"].transform([data["Departure_Airport"]])[0]
            print(f"  ✅ Departure encoded: {departure_enc}")
            
            print(f"  Arrival: {data['Arrival_Airport']}")
            arrival_enc = encoders["arrival"].transform([data["Arrival_Airport"]])[0]
            print(f"  ✅ Arrival encoded: {arrival_enc}")
            
            print(f"  Status: {data['Flight_Status']}")
            status_enc = encoders["status"].transform([data["Flight_Status"]])[0]
            print(f"  ✅ Status encoded: {status_enc}")
            
        except ValueError as ve:
            print(f"❌ Encoding error: {ve}")
            raise HTTPException(400, f"Value not found in training data: {str(ve)}")
        
        # Create input DataFrame with exact feature order
        input_df = pd.DataFrame([{
            "Dep_Hour": dt.hour,
            "Dep_Day": dt.day,
            "Dep_Month": dt.month,
            "Dep_Weekday": dt.dayofweek,
            "Airline_Encoded": airline_enc,
            "Departure_Encoded": departure_enc,
            "Arrival_Encoded": arrival_enc,
            "Status_Encoded": status_enc,
        }])
        
        print(f"✅ Input DataFrame created: {input_df.to_dict()}")
        
        # Ensure correct column order
        X = input_df[feature_order]
        print(f"✅ Features ordered: {X.values}")
        
        # Scale features
        X_scaled = scaler.transform(X)
        print(f"✅ Features scaled: {X_scaled}")
        
        # Make prediction
        prediction = model.predict(X_scaled)[0]
        probabilities = model.predict_proba(X_scaled)[0]
        print(f"✅ Prediction: {prediction}")
        print(f"✅ Probabilities: {probabilities}")
        
        # Map severity to estimated delay minutes
        delay_map = {"No Delay": 0, "Minor": 15, "Major": 60}
        estimated_delay = delay_map.get(prediction, 0)
        
        # Get confidence for the predicted class
        predicted_idx = list(model.classes_).index(prediction)
        confidence = float(probabilities[predicted_idx])
        
        result = {
            "predicted_severity": prediction,
            "estimated_delay_minutes": estimated_delay,
            "severity_confidence": confidence,
            "all_probabilities": {
                str(cls): float(prob) 
                for cls, prob in zip(model.classes_, probabilities)
            }
        }
        
        print(f"✅ Returning result: {result}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ FULL ERROR:\n{error_details}")
        raise HTTPException(500, f"Chart 3 Error: {str(e)}")

@app.get("/options")
def get_options():
    if MODELS.get("flight"):
        return {"carriers": MODELS["flight"]["carriers"], "airports": MODELS["flight"]["airports"]}
    return {"carriers": [], "airports": []}

@app.get("/health")
async def health():
    return {"All good! The flight delay engine is running smoothly",
        }