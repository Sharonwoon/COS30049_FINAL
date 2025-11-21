// src/App.js
import React, { useState } from "react";
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

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

// delay-count choices – you can adjust these ranges
const DELAY_COUNT_OPTIONS = [0, 5, 10, 15, 20, 30, 40, 50];

function App() {
  const [form, setForm] = useState({
    carrier: "",
    airport: "",
    month: 1,
    weather_delay_count: 0,
    carrier_delay_count: 0,
    late_aircraft_count: 0,
    cancelled_flights: 0,
  });

  // current, live data
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]); // each item: { total_delay_minutes, high_weather_risk, delay_category, input }

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isHighRisk, setIsHighRisk] = useState(false);

  // default is "predict" so Chart 1 opens directly on the tool
  const [page, setPage] = useState("predict"); // "home" | "predict"

  // saved snapshot when user leaves Prediction tool
  const [savedHistory, setSavedHistory] = useState(null);
  const [savedResult, setSavedResult] = useState(null);
  const [historyLastSavedAt, setHistoryLastSavedAt] = useState(null);
  const [hasClearedOnNavigate, setHasClearedOnNavigate] = useState(false);

  // ---- handlers ----
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ensure numeric values are sent to backend
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

      // store a combined record for charts & tooltips
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
      const res = await healthCheck();
      alert("Backend status: " + JSON.stringify(res));
    } catch (err) {
      alert("Backend not reachable");
    }
  }

  // when switching between Home / Prediction tool
  function handleNavigate(nextPage) {
    if (page === nextPage) return;

    // leaving prediction page -> save & clear everything
    if (page === "predict" && nextPage !== "predict") {
      if (history.length > 0 || result) {
        setSavedHistory(history);
        setSavedResult(result);
        setHistoryLastSavedAt(new Date());
        setHistory([]);
        setResult(null);
        setIsHighRisk(false);
        setHasClearedOnNavigate(true);
      }
    }

    setPage(nextPage);
  }

  // restore charts + result
  function handleRestorePrevious() {
    if (!savedHistory && !savedResult) return;

    setHistory(savedHistory || []);
    setResult(savedResult || null);
    setIsHighRisk(!!savedResult?.high_weather_risk);
    setHasClearedOnNavigate(false);
  }

  // format time for the “last saved” text
  function renderLastSavedTime() {
    if (!historyLastSavedAt) return "";
    return historyLastSavedAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className={`App ${isHighRisk ? "App--raining" : ""}`}>
      {/* Background layers */}
      <div className="clouds-bg" />
      <div className="rain-bg" />

      {/* Shared header (no Home button here anymore) */}
      <header className="header">
        <h1>Flight Weather Delay Prediction</h1>
        <p className="subtitle">
          Explore how weather and airline delays impact your flight&apos;s
          arrival time.
        </p>

        <div className="header-actions">
          {/* Only Prediction tool button is kept */}
          <button
            type="button"
            className={`nav-btn ${
              page === "predict" ? "nav-btn--active" : ""
            }`}
            onClick={() => handleNavigate("predict")}
          >
            Prediction tool
          </button>

          <button className="health-btn" onClick={handleHealthCheck}>
            Check backend status
          </button>
        </div>
      </header>

      {/* -------- HOME PAGE (still kept if you ever navigate to it programmatically) -------- */}
      {page === "home" && (
        <main className="home">
          <section className="home-hero">
            <h2>Welcome on board ✈️</h2>
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

      {/* -------- PREDICTION PAGE -------- */}
      {page === "predict" && (
        <>
          {/* Restore section (only after a clear happened) */}
          {(savedHistory || savedResult) && hasClearedOnNavigate && (
            <div className="restore-wrapper">
              <button
                type="button"
                className="restore-btn"
                onClick={handleRestorePrevious}
              >
                Restore previous charts
              </button>
              {historyLastSavedAt && (
                <div className="restore-meta">
                  History last saved at {renderLastSavedTime()}
                </div>
              )}
            </div>
          )}

          {/* Flight input form */}
          <form onSubmit={handleSubmit} className="form">
            <h2>Flight input details</h2>

            {/* Carrier */}
            <div className="form-row">
              <label htmlFor="carrier">Carrier code</label>
              <select
                id="carrier"
                name="carrier"
                value={form.carrier}
                onChange={handleChange}
                required
              >
                <option value="">Select carrier…</option>
                {CARRIER_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <span className="hint">
                Airline operating the route (e.g. AA, DL, 9E).
              </span>
            </div>

            {/* Airport */}
            <div className="form-row">
              <label htmlFor="airport">Airport code</label>
              <select
                id="airport"
                name="airport"
                value={form.airport}
                onChange={handleChange}
                required
              >
                <option value="">Select airport…</option>
                {AIRPORT_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              <span className="hint">
                Destination airport for this prediction.
              </span>
            </div>

            {/* Month */}
            <div className="form-row">
              <label htmlFor="month">Month</label>
              <select
                id="month"
                name="month"
                value={form.month}
                onChange={handleChange}
                required
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="hint">
                Choose the month of travel for this route.
              </span>
            </div>

            {/* Weather delay count */}
            <div className="form-row">
              <label htmlFor="weather_delay_count">
                Weather delay count (flights)
              </label>
              <select
                id="weather_delay_count"
                name="weather_delay_count"
                value={form.weather_delay_count}
                onChange={handleChange}
              >
                {DELAY_COUNT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="hint">
                Number of flights delayed due to weather in that month.
              </span>
            </div>

            {/* Carrier delay count */}
            <div className="form-row">
              <label htmlFor="carrier_delay_count">
                Carrier delay count (flights)
              </label>
              <select
                id="carrier_delay_count"
                name="carrier_delay_count"
                value={form.carrier_delay_count}
                onChange={handleChange}
              >
                {DELAY_COUNT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="hint">
                Delays caused by airline operations (crew, maintenance, etc.).
              </span>
            </div>

            {/* Late aircraft count */}
            <div className="form-row">
              <label htmlFor="late_aircraft_count">
                Late aircraft count (flights)
              </label>
              <select
                id="late_aircraft_count"
                name="late_aircraft_count"
                value={form.late_aircraft_count}
                onChange={handleChange}
              >
                {DELAY_COUNT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="hint">
                Flights delayed because the previous flight using the same
                aircraft arrived late.
              </span>
            </div>

            {/* Cancelled flights */}
            <div className="form-row">
              <label htmlFor="cancelled_flights">Cancelled flights</label>
              <select
                id="cancelled_flights"
                name="cancelled_flights"
                value={form.cancelled_flights}
                onChange={handleChange}
              >
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="hint">
                Number of flights cancelled on this route in that month.
              </span>
            </div>

            <button type="submit" disabled={loading} className="primary-btn">
              {loading ? "Predicting…" : "Predict"}
            </button>

            {error && <p className="error-text">{error}</p>}
          </form>

          {/* Prediction summary */}
          {result && (
            <div className="result">
              <h2>Prediction Result</h2>
              <p>
                Weather risk:{" "}
                <strong>{result.high_weather_risk ? "High" : "Low"}</strong>
              </p>
              <p>
                Total arrival delay:{" "}
                <strong>{result.total_delay_minutes} minutes</strong>
              </p>
              <p>
                Delay category (KNN):{" "}
                <strong>{result.delay_category}</strong>
              </p>
            </div>
          )}

          {/* Charts for visualisation */}
          <ChartsPanel history={history} />
        </>
      )}
    </div>
  );
}

export default App;
