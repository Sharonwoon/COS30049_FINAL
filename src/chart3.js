import React, { useState, useEffect } from 'react';
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

// Manages the background of the entire page.
  useEffect(() => {
    // When this component loads, add a specific class to the <body> tag
    document.body.classList.add('body-chart3-active');

    // When the component is unmounted, the cleanup function runs and removes the class
    return () => {
      document.body.classList.remove('body-chart3-active');
    };
  }, []); 

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

      // Convert datetime-local format to DD/MM/YYYY HH:MM
      const dateObj = new Date(formData.Departure_Time);
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        setError('Invalid date selected');
        setIsLoading(false);
        return;
      }
      
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      const formattedDateTime = `${day}/${month}/${year} ${hours}:${minutes}`;

      const submissionData = {
        Airline: formData.Airline,
        Departure_Airport: formData.Departure_Airport,
        Arrival_Airport: formData.Arrival_Airport,
        Flight_Status: 'On-time',
        Departure_Time: formattedDateTime
      };

      console.log('📤 Sending to backend:', submissionData);
      console.log('📅 Formatted date:', formattedDateTime);

      const response = await axios.post(apiEndpoint, submissionData);
      const data = response.data;

      console.log('📥 Response from backend:', data);

      const chartData = Object.entries(data.all_probabilities).map(([key, value]) => ({
        label: key,
        value: value * 100
      }));

      setPredictionResult(chartData);
      setPredictedCategory(data.predicted_severity);

    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Unknown error';
      setError(`Error: ${errorMsg}`);
      console.error("❌ Error fetching prediction:", err);
      console.error("❌ Error details:", err.response?.data);
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