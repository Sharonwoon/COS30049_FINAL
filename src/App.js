import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";

import Home from "./home";
import Chart1 from "./chart1";
import Chart2 from "./chart2";
import Chart3 from "./chart3";

// Re-usable pill button for the top navigation bar
function NavButton({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`top-nav-btn ${isActive ? "top-nav-btn--active" : ""}`}
    >
      {children}
    </Link>
  );
}

function Shell() {
  return (
    <div className="page-shell">
      {/* TOP BAR: title on the left, nav on the right */}
      <header className="dashboard-header">
        <div className="dashboard-title">My Charts Dashboard</div>

        <nav className="dashboard-nav">
          <NavButton to="/home">Home</NavButton>
          <NavButton to="/chart1">Prediction Tool</NavButton>
          <NavButton to="/chart2">Chart 2</NavButton>
          <NavButton to="/chart3">Flight Delay Forecast</NavButton>
        </nav>
      </header>

      {/* Routed content */}
      <main>
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/chart1" element={<Chart1 />} />
          <Route path="/chart2" element={<Chart2 />} />
          <Route path="/chart3" element={<Chart3 />} />
          {/* default route -> home */}
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
