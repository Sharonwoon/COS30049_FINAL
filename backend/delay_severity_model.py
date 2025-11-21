import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier


class SimpleFlightDelayModel:
    def __init__(self):
        # Will be filled during training or loading
        self.model = None
        self.scaler = None
        self.encoders = {}
        self.feature_order = [
            "Dep_Hour", "Dep_Day", "Dep_Month", "Dep_Weekday",
            "Airline_Encoded", "Departure_Encoded", "Arrival_Encoded", "Status_Encoded"
        ]

    # -------------------------------------------------------
    # 1. TRAIN MODEL (Run: python model.py)
    # -------------------------------------------------------
    def train(self, dataset_path="../dataset/flight_data_prices.csv"):
        """
        Train the KNN model using your full dataset.
        Will generate delay_severity_model.pkl.
        """

        print("Loading dataset...")
        df = pd.read_csv(dataset_path)

        print("Columns found in dataset:", df.columns.tolist())


        # Convert flight delay minutes into categories
        def categorize_delay(m):
            if m == 0: return "No Delay"
            elif m <= 30: return "Minor"
            else: return "Major"

        df["Delay_Severity"] = df["Delay_Minutes"].apply(categorize_delay)

        # Create encoders
        print("Encoding categorical columns...")
        self.encoders["airline"] = LabelEncoder()
        self.encoders["departure"] = LabelEncoder()
        self.encoders["arrival"] = LabelEncoder()
        self.encoders["status"] = LabelEncoder()

        df["Airline_Encoded"] = self.encoders["airline"].fit_transform(df["Airline"])
        df["Departure_Encoded"] = self.encoders["departure"].fit_transform(df["Departure_Airport"])
        df["Arrival_Encoded"] = self.encoders["arrival"].fit_transform(df["Arrival_Airport"])
        df["Status_Encoded"] = self.encoders["status"].fit_transform(df["Flight_Status"])

        # Convert datetime
        print("Processing datetime...")
        df["Departure_Time"] = pd.to_datetime(df["Departure_Time"], format="%d/%m/%Y %H:%M", errors="coerce")
        df["Dep_Hour"] = df["Departure_Time"].dt.hour
        df["Dep_Day"] = df["Departure_Time"].dt.day
        df["Dep_Month"] = df["Departure_Time"].dt.month
        df["Dep_Weekday"] = df["Departure_Time"].dt.dayofweek

        # Select features
        X = df[self.feature_order]
        y = df["Delay_Severity"]

        # Split dataset
        print("Training model...")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # Scale input features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)

        # Train model
        self.model = KNeighborsClassifier(n_neighbors=5)
        self.model.fit(X_train_scaled, y_train)

        # Save everything in ONE FILE
        bundle = {
            "model": self.model,
            "scaler": self.scaler,
            "encoders": self.encoders,
            "feature_order": self.feature_order
        }

        joblib.dump(bundle, "delay_severity_model.pkl")
        print("delay_severity_model.pkl created successfully!")

    # -------------------------------------------------------
    # 2. PREDICT
    # -------------------------------------------------------
    def predict(self, data):
        """
        Used by FastAPI to make predictions.
        Loads trained model + preprocess input.
        """

        # Load bundle file
        bundle = joblib.load("delay_severity_model.pkl")
        model = bundle["model"]
        scaler = bundle["scaler"]
        enc = bundle["encoders"]
        feature_order = bundle["feature_order"]

        # Extract datetime
        dt = pd.to_datetime(data["Departure_Time"], errors="coerce")

        # Prepare features for prediction
        df = pd.DataFrame([{
            "Dep_Hour": dt.hour,
            "Dep_Day": dt.day,
            "Dep_Month": dt.month,
            "Dep_Weekday": dt.dayofweek,
            "Airline_Encoded": enc["airline"].transform([data["Airline"]])[0],
            "Departure_Encoded": enc["departure"].transform([data["Departure_Airport"]])[0],
            "Arrival_Encoded": enc["arrival"].transform([data["Arrival_Airport"]])[0],
            "Status_Encoded": enc["status"].transform([data["Flight_Status"]])[0],
        }])

        # Scale features
        X = df[feature_order]
        X_scaled = scaler.transform(X)

        # Predict
        prediction = model.predict(X_scaled)[0]
        probabilities = model.predict_proba(X_scaled)[0]

        return {
            "prediction": prediction,
            "probabilities": {
                model.classes_[i]: float(probabilities[i]) for i in range(len(model.classes_))
            }
        }


# -------------------------------------------------------
# TRAIN MODEL ONLY WHEN RUN DIRECTLY
# -------------------------------------------------------
if __name__ == "__main__":
    trainer = SimpleFlightDelayModel()
    trainer.train(r"../data/flight_data_prices.csv")

