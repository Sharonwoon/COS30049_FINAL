// src/pages/Home.js
import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="home">
      <section className="home-hero">
        <h2>Welcome on board</h2>

        <p>
          Get instant, data-driven insights into flight delays using real airline and weather data. 
          Choose one of our three specialized predictors below — each designed for a different travel scenario.
        </p>

        <ul className="home-list">
          <li>
            <strong>Flight Weather Delay Prediction</strong><br />
            Enter weather & airline delay counts → get exact risk score and total delay minutes.
          </li>
          <li>
            <strong>Seasonal Trend & Competitor Analysis</strong><br />
            Compare your airline’s performance against others with interactive charts and smart recommendations.
          </li>
          <li>
            <strong>Flight Timeliness Predictor</strong><br />
            Enter your exact flight (airline, route, date & time) → know if it will be On Time, Minor, or Major delay.
          </li>
        </ul>

        <Link to="/chart1" className="primary-btn home-cta">
          Explore All Predictors
        </Link>
      </section>
    </main>
  );
}