import React, { useState, useEffect, useRef } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: 1,
    carrier: '',
    airport: ''
  });

  const [options, setOptions] = useState({ carriers: [], airports: [] });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // NEW: State to track which competitor is selected for comparison
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);
  
  // Ref to scroll to chart on click
  const comparisonRef = useRef(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch('http://localhost:8000/options');
        if (!res.ok) throw new Error("Failed to load dropdown options");
        const data = await res.json();
        setOptions(data);
        if (data.carriers.length > 0 && data.airports.length > 0) {
          setFormData(prev => ({ ...prev, carrier: data.carriers[0], airport: data.airports[0] }));
        }
      } catch (err) {
        setError("Could not load Carrier/Airport lists. Ensure backend is running.");
      }
    };
    fetchOptions();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setSelectedCompetitor(null); // Reset selection on new search

    try {
      const payload = {
        ...formData,
        year: parseInt(formData.year),
        month: parseInt(formData.month),
        carrier: formData.carrier,
        airport: formData.airport
      };

      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to fetch prediction.');

      const data = await response.json();
      setResult(data);
      
      // Automatically select the best competitor initially if available
      if (data.competitors && data.competitors.length > 0) {
        setSelectedCompetitor(data.competitors[0]);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Handler for clicking a recommendation
  const handleCompetitorClick = (comp) => {
    setSelectedCompetitor(comp);
    // Smooth scroll to the chart
    if(comparisonRef.current) {
      comparisonRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`Month: ${label}`}</p>
          <p style={{ color: '#413ea0' }}>{`Flights: ${payload[0].value}`}</p>
          <p style={{ color: '#ff7300' }}>{`Risk: ${(payload[1].value * 100).toFixed(1)}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>✈️ Flight Weather Impact AI</h1>
        <p>Predict delays and analyze market alternatives</p>
      </header>

      <main className="main-content">
        <div className="card form-card">
          <h2>Route Details</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Year</label>
                <input type="number" name="year" value={formData.year} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Month</label>
                <select name="month" value={formData.month} onChange={handleChange}>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Carrier</label>
                <select name="carrier" value={formData.carrier} onChange={handleChange}>
                  {options.carriers.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Airport</label>
                <select name="airport" value={formData.airport} onChange={handleChange}>
                  {options.airports.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="predict-btn" disabled={loading}>
              {loading ? 'Analyzing...' : 'Predict Impact'}
            </button>
          </form>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {result && (
          <div className="results-container">
            
            {/* 1. Prediction Result */}
            <div className={`card result-card ${result.risk_class === 1 ? 'high-risk' : 'low-risk'}`}>
              <h2>Prediction Result</h2>
              <div className="badge">{result.risk_level}</div>
              <div className="stats-grid">
                <div className="stat-item">
                  <span>Confidence</span>
                  <strong>{(result.confidence_high_risk * 100).toFixed(1)}%</strong>
                </div>
                <div className="stat-item">
                  <span>Your Airline Risk</span>
                  <strong>{(result.historical_weather_prop * 100).toFixed(2)}%</strong>
                </div>
                <div className="stat-item">
                  <span>Market Threshold</span>
                  <strong>{(result.threshold * 100).toFixed(2)}%</strong>
                </div>
              </div>
            </div>

            {/* 2. Smart Recommendations (Clickable) */}
            {result.competitors.length > 0 && (
              <div className="card recommendation-card">
                <h3>💡 Smart Recommendations</h3>
                <p>Click on an airline below to compare it in the chart:</p>
                <div className="competitor-list">
                  {result.competitors.map((comp, index) => (
                    <div 
                      key={index} 
                      // NEW: Add onClick and dynamic class for styling
                      onClick={() => handleCompetitorClick(comp)}
                      className={`competitor-item ${selectedCompetitor && selectedCompetitor.carrier === comp.carrier ? 'active-comp' : ''}`}
                    >
                      <span className="comp-name">{comp.carrier}</span>
                      <span className="comp-risk">{(comp.risk_score * 100).toFixed(1)}% Risk</span>
                      <span className="comp-saved">
                        Diff: {((result.historical_weather_prop - comp.risk_score) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Seasonal Chart */}
            <div className="card chart-card">
              <h3>Seasonal Trend Analysis</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <ComposedChart data={result.trend_data} margin={{top:20, right:20, left:0, bottom:0}}>
                    <CartesianGrid stroke="#f5f5f5" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" orientation="left" stroke="#413ea0" />
                    <YAxis yAxisId="right" orientation="right" stroke="#ff7300" tickFormatter={(t)=>`${(t*100).toFixed(0)}%`}/>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceLine yAxisId="right" y={result.threshold} label="Threshold" stroke="red" strokeDasharray="3 3" />
                    <Bar yAxisId="left" dataKey="flight_volume" name="Volume" barSize={20} fill="#413ea0" />
                    <Line yAxisId="right" type="monotone" dataKey="risk_score" name="Risk %" stroke="#ff7300" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Interactive Comparison Chart */}
            {selectedCompetitor && (
               <div className="card chart-card" ref={comparisonRef}>
                 <h3>Interactive Comparison</h3>
                 <p style={{fontSize:'0.9rem', color:'#666'}}>
                   Comparing your choice <b>{formData.carrier}</b> vs. Selected Alternative <b>{selectedCompetitor.carrier}</b>
                 </p>
                 <div style={{ width: '100%', height: 350 }}>
                   <ResponsiveContainer>
                     <RadarChart outerRadius={110} data={[
                       { 
                         subject: 'Risk Score (Lower is Better)', 
                         A: result.historical_weather_prop * 100, 
                         B: selectedCompetitor.risk_score * 100, 
                         fullMark: 10 
                       },
                       { 
                         subject: 'Reliability (Higher is Better)', 
                         A: 100 - (result.historical_weather_prop * 100), 
                         B: 100 - (selectedCompetitor.risk_score * 100), 
                         fullMark: 100 
                       },
                       { 
                         subject: 'Volume Factor', 
                         A: result.trend_data.find(x => x.month === parseInt(formData.month))?.flight_volume / 100 || 0, 
                         B: selectedCompetitor.flight_volume / 100, 
                         fullMark: 150 
                       },
                     ]}>
                       <PolarGrid />
                       <PolarAngleAxis dataKey="subject" />
                       <PolarRadiusAxis angle={30} domain={[0, 'auto']}/>
                       <Radar name={formData.carrier} dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.5} />
                       <Radar name={selectedCompetitor.carrier} dataKey="B" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.5} />
                       <Legend />
                       <Tooltip />
                     </RadarChart>
                   </ResponsiveContainer>
                 </div>
               </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;