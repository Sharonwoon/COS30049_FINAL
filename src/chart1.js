// src/pages/Chart1.js
import React, { useState, useEffect } from "react";
import "./App.css";
import { predictDelay, healthCheck } from "./api";
import ChartsPanel from "./components/ChartsPanel";

// ---- Options for dropdowns ----
const CARRIER_OPTIONS = [
  { value: "9E", label: "9E – Endeavor Air" },
  { value: "AA", label: "AA – American Airlines" },
  { value: "DL", label: "DL – Delta Air Lines" },
  { value: "UA", label: "UA – United Airlines" },
];

const AIRPORT_OPTIONS = [
  { value: "ABE", label: "ABE – Lehigh Valley Intl (PA)" },
  { value: "ATL", label: "ATL – Hartsfield–Jackson Atlanta Intl" },
  { value: "LAX", label: "LAX – Los Angeles Intl" },
  { value: "JFK", label: "JFK – New York JFK Intl" },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(0, i).toLocaleString("default", { month: "long" }),
}));

const DELAY_COUNT_OPTIONS = [0, 5, 10, 15, 20, 30, 40, 50];

// localStorage keys
const LS_HISTORY_KEY = "chart1_savedHistory";
const LS_RESULT_KEY = "chart1_savedResult";
const LS_TIME_KEY = "chart1_lastSavedAt";

function Chart1() {
  const [form, setForm] = useState({
    carrier: "",
    airport: "",
    month: 1,
    weather_delay_count: 0,
    carrier_delay_count: 0,
    late_aircraft_count: 0,
    cancelled_flights: 0,
  });

  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isHighRisk, setIsHighRisk] = useState(false);
  const [page, setPage] = useState("predict");

  const [savedHistory, setSavedHistory] = useState(null);
  const [savedResult, setSavedResult] = useState(null);
  const [historyLastSavedAt, setHistoryLastSavedAt] = useState(null);
  const [hasClearedOnNavigate, setHasClearedOnNavigate] = useState(false);

  // Load saved state
  useEffect(() => {
    try {
      const histJSON = localStorage.getItem(LS_HISTORY_KEY);
      const resJSON = localStorage.getItem(LS_RESULT_KEY);
      const timeISO = localStorage.getItem(LS_TIME_KEY);

      if (histJSON || resJSON) {
        if (histJSON) setSavedHistory(JSON.parse(histJSON));
        if (resJSON) setSavedResult(JSON.parse(resJSON));
        if (timeISO) setHistoryLastSavedAt(new Date(timeISO));
        setHasClearedOnNavigate(true);
      }
    } catch (e) {
      console.error("Failed to read saved Chart1 state:", e);
    }
  }, []);

  // Save state on unmount
  useEffect(() => {
    return () => {
      if (history.length > 0 || result) {
        try {
          localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(history));
          localStorage.setItem(LS_RESULT_KEY, JSON.stringify(result));
          localStorage.setItem(LS_TIME_KEY, new Date().toISOString());
        } catch (e) {
          console.error("Failed to save Chart1 state:", e);
        }
      }
    };
  }, [history, result]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        ...form,
        month: Number(form.month),
        weather_delay_count: Number(form.weather_delay_count),
        carrier_delay_count: Number(form.carrier_delay_count),
        late_aircraft_count: Number(form.late_aircraft_count),
        cancelled_flights: Number(form.cancelled_flights),
      };

      const res = await predictDelay(payload);

      setResult(res);
      setIsHighRisk(!!res?.high_weather_risk);

      const record = {
        total_delay_minutes: res.total_delay_minutes,
        high_weather_risk: !!res.high_weather_risk,
        delay_category: res.delay_category,
        input: payload,
      };

      setHistory((prev) => [...prev, record]);
    } catch (err) {
      console.error(err);
      setError(
        (err.response && err.response.data && err.response.data.detail) ||
          "Something went wrong talking to the API"
      );
      setIsHighRisk(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleHealthCheck() {
    try {
      await healthCheck();
      alert("Backend is live and working great!");
    } catch (err) {
      alert("Backend not reachable");
    }
  }

  function handleNavigate(nextPage) {
    if (page === nextPage) return;
    setPage(nextPage);
  }

  function handleRestorePrevious() {
    if (!savedHistory && !savedResult) return;

    setHistory(savedHistory || []);
    setResult(savedResult || null);
    setIsHighRisk(!!savedResult?.high_weather_risk);
    setHasClearedOnNavigate(false);

    setSavedHistory(null);
    setSavedResult(null);
    localStorage.removeItem(LS_HISTORY_KEY);
    localStorage.removeItem(LS_RESULT_KEY);
    localStorage.removeItem(LS_TIME_KEY);
  }

  function renderLastSavedTime() {
    if (!historyLastSavedAt) return "";
    return historyLastSavedAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className={`App ${isHighRisk ? "App--raining" : ""}`}>
      <div className="clouds-bg" />
      <div className="rain-bg" />

      <header className="header">
        <h1>Flight Weather Delay Prediction</h1>
        <p className="subtitle">
          Explore how weather and airline delays impact your flight's arrival time.
          When the weather risk is high, it will change to rainy day.
        </p>

        <div className="header-actions">
          {/* Hidden nav button */}
          <button
            type="button"
            className={`nav-btn ${page === "predict" ? "nav-btn--active" : ""}`}
            onClick={() => handleNavigate("predict")}
            style={{ display: "none" }}
          >
            Weather Prediction
          </button>

          {/* STATUS + RESTORE BUTTONS SIDE BY SIDE */}
          <div className="status-and-restore">
            <button className="health-btn" onClick={handleHealthCheck}>
              Check backend status
            </button>

            {(savedHistory || savedResult) && hasClearedOnNavigate && (
              <button className="restore-btn-inline" onClick={handleRestorePrevious}>
                Restore previous charts
              </button>
            )}
          </div>
        </div>

        {/* Show saved time below buttons */}
        {(savedHistory || savedResult) && hasClearedOnNavigate && (
          <div className="restore-meta-inline">
            History last saved at {renderLastSavedTime()}
          </div>
        )}
      </header>

      {page === "home" && (
        <main className="home">
          <section className="home-hero">
            <h2>Welcome on board</h2>
            <p>
              Use this tool to explore how weather, delays, cancellations and
              operational factors can affect flight arrival time.
            </p>
            <ul className="home-list">
              <li>Choose a carrier, airport and month.</li>
              <li>Input delay or cancellation counts.</li>
              <li>See total expected delay and risk level.</li>
              <li>View delay trends in charts.</li>
            </ul>
            <button
              type="button"
              className="primary-btn home-cta"
              onClick={() => handleNavigate("predict")}
            >
              Start prediction
            </button>
          </section>
        </main>
      )}

      {page === "predict" && (
        <>
          <form onSubmit={handleSubmit} className="form">
            <h2>Flight input details</h2>

            <div className="form-row">
              <label htmlFor="carrier">Carrier code</label>
              <select id="carrier" name="carrier" value={form.carrier} onChange={handleChange} required>
                <option value="">Select carrier…</option>
                {CARRIER_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <span className="hint">Airline operating the route (e.g. AA, DL, 9E).</span>
            </div>

            <div className="form-row">
              <label htmlFor="airport">Airport code</label>
              <select id="airport" name="airport" value={form.airport} onChange={handleChange} required>
                <option value="">Select airport…</option>
                {AIRPORT_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="month">Month</label>
              <select id="month" name="month" value={form.month} onChange={handleChange} required>
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label>Weather delay count (flights)</label>
              <select name="weather_delay_count" value={form.weather_delay_count} onChange={handleChange}>
                {DELAY_COUNT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="form- row">
              <label>Carrier delay count (flights)</label>
              <select name="carrier_delay_count" value={form.carrier_delay_count} onChange={handleChange}>
                {DELAY_COUNT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="form-row">
              <label>Late aircraft count (flights)</label>
              <select name="late_aircraft_count" value={form.late_aircraft_count} onChange={handleChange}>
                {DELAY_COUNT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="form-row">
              <label>Cancelled flights</label>
              <select name="cancelled_flights" value={form.cancelled_flights} onChange={handleChange}>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={loading} className="primary-btn">
              {loading ? "Predicting…" : "Predict"}
            </button>

            {error && <p className="error-text">{error}</p>}
          </form>

          {result && (
            <div className="result">
              <h2>Prediction Result</h2>
              <p>Weather risk: <strong>{result.high_weather_risk ? "High" : "Low"}</strong></p>
              <p>Total arrival delay: <strong>{result.total_delay_minutes} minutes</strong></p>
              <p>Delay category (KNN): <strong>{result.delay_category}</strong></p>
            </div>
          )}

          <ChartsPanel history={history} />
        </>
      )}
    </div>
  );
}

export default Chart1;