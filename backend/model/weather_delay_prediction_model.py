import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import joblib

# A simple regression model
class SimpleModel:
    def __init__(self):
        # Initialize the model (Linear Regression)
        self.model = LinearRegression()

    def train(self):
        # Example training data: X = [[square footage, bedrooms]], y = [price]
        X = np.array([[1500, 3], [1200, 2], [1800, 4], [2000, 5], [1400, 2], [1600, 3]])
        y = np.array([300000, 250000, 400000, 500000, 270000, 320000])
        
        # Train the model
        self.model.fit(X, y)
        
        # Save the model
        joblib.dump(self.model, 'simple_model.pkl')

        # Evaluation
        predictions = self.model.predict(X)
        mse = mean_squared_error(y, predictions)
        r2 = r2_score(y, predictions)

        print(f"Model trained. MSE: {mse}, R²: {r2}")

    def predict(self, square_footage, bedrooms):
        # Load the model
        model = joblib.load('simple_model.pkl')
        
        # Make a prediction based on input
        return model.predict([[square_footage, bedrooms]])

# Example usage (for initial training)
if __name__ == "__main__":
    model = SimpleModel()
    model.train()