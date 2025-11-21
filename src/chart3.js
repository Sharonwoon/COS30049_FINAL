import React, { useState } from 'react';
import axios from 'axios';
import DoughnutChart from './components/DoughnutChart';
import FlightProgressBar from './components/FlightProgressBar';
import './App.css';

function Chart3() {
  // Hold the data for the doughnut chart, received from the API
  const [predictionResult, setPredictionResult] = useState(null);
  // Hold the outcome string 
  const [predictedCategory, setPredictedCategory] = useState('');
  // Hold any error message
  const [error, setError] = useState('');
  // Track if the API call is in progress 
  const [isLoading, setIsLoading] = useState(false);

  // Hold all the data from the user input form
  const [formData, setFormData] = useState({
    Airline: 'Southwest',
    Departure_Airport: 'SFO',
    Arrival_Airport: 'LAX',
    Departure_Time: '2025-11-20T22:15',
  });

  // Updates the formData state when a user types in the form field
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  setError('');
  setPredictionResult(null);
  setPredictedCategory('');

  try {
    const apiEndpoint = 'http://localhost:8000/predict';

    const submissionData = {
      ...formData,
      Flight_Status: 'On-time',
      Departure_Time: new Date(formData.Departure_Time)
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19)
    };

    const response = await axios.post(apiEndpoint, submissionData);
    const data = response.data;

    const chartData = Object.entries(data.probabilities).map(([key, value]) => ({
      label: key,
      value: value * 100
    }));

    setPredictionResult(chartData);
    setPredictedCategory(data.prediction);

  } catch (err) {
    setError('An error occurred. Please ensure the backend server is running and check input values.');
    console.error("Error fetching prediction:", err);
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="chart3-page-wrapper">
      <header className="chart3-header">
        
        <h1 className="chart3-main-title">Flight Timeliness Predictor</h1>
        <p className="chart3-subtitle">
          Enter your flight data to receive a forecast on punctuality and potential delay severity
        </p>

        <div className="chart3-content-container">
          {/* The user input form */}
          <div className="chart3-form-card">
            <form onSubmit={handleSubmit}>
              {/* Form fields */}
              <label>Airline</label>
              <select name="Airline" value={formData.Airline} onChange={handleInputChange}>
                <option value="Southwest">Southwest</option>
                <option value="United">United</option>
                <option value="Delta">Delta</option>
                <option value="American Airlines">American Airlines</option>
                <option value="JetBlue">JetBlue</option>
              </select>
              <label>Departure Airport</label>
              <select name="Departure_Airport" value={formData.Departure_Airport} onChange={handleInputChange}>
                  <option value="ATL">ATL</option>
                  <option value="DFW">DFW</option>
                  <option value="JFK">JFK</option>
                  <option value="LAX">LAX</option>
                  <option value="ORD">ORD</option>
                  <option value="SEA">SEA</option>
                  <option value="SFO">SFO</option>
                  <option value="DEN">DEN</option>
              </select>
              <label>Arrival Airport</label>
              <select name="Arrival_Airport" value={formData.Arrival_Airport} onChange={handleInputChange}>
                  <option value="ATL">ATL</option>
                  <option value="DFW">DFW</option>
                  <option value="JFK">JFK</option>
                  <option value="LAX">LAX</option>
                  <option value="ORD">ORD</option>
                  <option value="SEA">SEA</option>
                  <option value="SFO">SFO</option>
                  <option value="DEN">DEN</option>
              </select>
              <label>Departure Time</label>
              <input
                type="datetime-local"
                name="Departure_Time"
                value={formData.Departure_Time}
                onChange={handleInputChange}
                required
              />
              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Forecasting...' : 'Predict Delay Severity'}
              </button>
            </form>
          </div>

          {/* This entire 'chart3-result-card' block will only render if the user has interacted with the form*/}
          {(isLoading || predictionResult || error) && (
            <div className="chart3-result-card">
              {/* Show a simple loading message while fetching data */}
              {isLoading && <p className="chart3-loading-text">Forecasting your flight...</p>}
              
              {/* Show the error if one occurred */}
              {error && <p className="chart3-error-text">{error}</p>}
              
              {/* Show the prediction output only when the result is available */}
              {predictionResult && (
                <div className="chart3-prediction-output">
                  <h2>Prediction Result</h2>
                  <h3>Most Likely Outcome: <span className={`chart3-category-${predictedCategory.replace(' ', '-')}`}>{predictedCategory}</span></h3>
                  
                  <FlightProgressBar key={predictedCategory + Date.now()} status={predictedCategory} />
                  
                  <DoughnutChart data={predictionResult} />
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default Chart3;