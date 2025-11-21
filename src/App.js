import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// Import your local components
import Chart1 from './chart1';
import Chart2 from './chart2';
import Chart3 from './chart3';

function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>My Charts Dashboard</h1>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ display: 'inline', marginRight: '20px' }}>
              <Link to="/">Chart 1</Link>
            </li>
            <li style={{ display: 'inline', marginRight: '20px' }}>
              <Link to="/chart2">Chart 2</Link>
            </li>
            <li style={{ display: 'inline', marginRight: '20px' }}>
              <Link to="/chart3">Chart 3</Link>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<Chart1 />} />
          <Route path="/chart2" element={<Chart2 />} />
          <Route path="/chart3" element={<Chart3 />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

// THIS IS THE IMPORTANT LINE YOU WERE MISSING
export default App;