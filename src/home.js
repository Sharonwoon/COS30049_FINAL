import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
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

        {/* 🔥 Updated link — now goes to Chart 1 */}
        <Link to="/chart1" className="primary-btn home-cta">
          Start prediction
        </Link>
      </section>
    </main>
  );
}
