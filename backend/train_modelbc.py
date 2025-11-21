import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib
import os

def train_and_save():
    file_path = 'Airline_Delay_Cause (1).csv'
    output_file = 'flight_model.pkl'
    
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    print("1. Loading Data...")
    df = pd.read_csv(file_path)

    # --- DATA CLEANING ---
    df.columns = df.columns.str.replace('[^A-Za-z0-9_]+', '', regex=True)
    df = df.rename(columns={
        'Numberofarrivingflights': 'TotalFlights',
        'Numberofflightsdelayedby15minutesormore': 'TotalDelayedFlights',
        'Weathercountdelayduetoweather': 'WeatherDelayCount',
        'Delayattributedtoweather': 'DelayAttributedToWeatherMinutes'
    })
    
    cols = ['TotalFlights', 'TotalDelayedFlights', 'WeatherDelayCount', 
            'Totalarrivaldelay', 'DelayAttributedToWeatherMinutes', 'month']
    for col in cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    df = df.dropna(subset=cols).copy()

    # --- FEATURE ENGINEERING ---
    df['WeatherDelayProportion'] = np.where(
        df['TotalDelayedFlights'] > 0, 
        df['WeatherDelayCount'] / df['TotalDelayedFlights'], 
        0
    )
    df['WeatherMinuteProportion'] = np.where(
        df['Totalarrivaldelay'] > 0, 
        df['DelayAttributedToWeatherMinutes'] / df['Totalarrivaldelay'], 
        0
    )

    # --- EXTRACT METADATA (For Dropdowns) ---
    unique_carriers = sorted(df['carrier'].dropna().unique().tolist())
    unique_airports = sorted(df['airport'].dropna().unique().tolist())
    print(f"   Found {len(unique_carriers)} carriers and {len(unique_airports)} airports.")

    # --- AGGREGATION ---
    features_to_average = [
        'WeatherDelayProportion', 'WeatherMinuteProportion', 
        'TotalFlights', 'WeatherDelayCount', 'TotalDelayedFlights'
    ]
    df_trainable = df.groupby(['carrier', 'airport', 'month'])[features_to_average].mean().reset_index()

    # --- TARGET DEFINITION ---
    threshold = df_trainable['WeatherDelayProportion'].quantile(0.75)
    df_trainable['HighWeatherImpact_Class'] = (df_trainable['WeatherDelayProportion'] >= threshold).astype(int)
    
    print(f"2. Training Random Forest (Threshold: {threshold:.4f})...")

    # --- TRAINING ---
    y = df_trainable['HighWeatherImpact_Class']
    X = df_trainable.drop(columns=['HighWeatherImpact_Class', 'WeatherDelayProportion'])

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), ['WeatherMinuteProportion', 'TotalFlights', 'WeatherDelayCount', 'TotalDelayedFlights']),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), ['month', 'carrier', 'airport'])
        ],
        remainder='drop'
    )

    pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=200, random_state=42, class_weight='balanced', max_depth=10))
    ])

    pipeline.fit(X, y)

    # --- SAVING EVERYTHING TO ONE FILE ---
    # We need to save the model, but also the historical averages (avg_df) for the charts
    # and the lists for the dropdowns.
    model_package = {
        "pipeline": pipeline,
        "avg_df": df_trainable,
        "threshold": threshold,
        "carriers": unique_carriers,
        "airports": unique_airports
    }

    print(f"3. Saving to {output_file}...")
    joblib.dump(model_package, output_file)
    print("Done! You can now run the server.")

if __name__ == "__main__":
    train_and_save()