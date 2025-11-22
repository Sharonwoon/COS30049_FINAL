import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
);

function ChartsPanel({ history }) {
  if (!history || history.length === 0) {
    return null;
  }

  const labels = history.map((_, idx) => `Prediction ${idx + 1}`);

  // ----- Bar + Line (combo) data -----
  const barLineData = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Predicted Total Delay (minutes)",
        data: history.map((h) => h.total_delay_minutes),
        backgroundColor: "rgba(52, 152, 219, 0.75)",
        borderRadius: 8,
      },
      {
        type: "line",
        label: "Trend Line",
        data: history.map((h) => h.total_delay_minutes),
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.25)",
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: false,
      },
    ],
  };

  const barLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (contexts) => contexts[0].label,
          label: (context) => {
            const index = context.dataIndex;
            const record = history[index];

            if (!record) {
              return "";
            }

            const input = record.input || {};
            const lines = [];

            if (context.dataset.type === "bar") {
              lines.push(
                `Total delay: ${record.total_delay_minutes} minutes`
              );
            } else {
              lines.push(
                `Trend value: ${record.total_delay_minutes} minutes`
              );
            }

            lines.push(`Carrier: ${input.carrier || "n/a"}`);
            lines.push(`Airport: ${input.airport || "n/a"}`);

            // month is stored as number (1-12)
            lines.push(
              `Month: ${input.month !== undefined ? input.month : "n/a"}`
            );

            lines.push(
              `Weather delays: ${
                input.weather_delay_count !== undefined
                  ? input.weather_delay_count
                  : "n/a"
              } flights`
            );
            lines.push(
              `Carrier delays: ${
                input.carrier_delay_count !== undefined
                  ? input.carrier_delay_count
                  : "n/a"
              } flights`
            );
            lines.push(
              `Late aircraft: ${
                input.late_aircraft_count !== undefined
                  ? input.late_aircraft_count
                  : "n/a"
              } flights`
            );
            lines.push(
              `Cancelled flights: ${
                input.cancelled_flights !== undefined
                  ? input.cancelled_flights
                  : "n/a"
              } flights`
            );

            return lines;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Delay (minutes)",
        },
      },
      x: {
        title: {
          display: true,
          text: "Prediction Weather",
        },
      },
    },
  };

  // ----- Pie chart data for high vs low risk -----
  const highCount = history.filter((h) => h.high_weather_risk).length;
  const lowCount = history.length - highCount;

  const pieData = {
    labels: ["High risk", "Low risk"],
    datasets: [
      {
        data: [highCount, lowCount],
        backgroundColor: ["#ff7b9c", "#58d0c9"],
        borderColor: ["#ffffff", "#ffffff"],
        borderWidth: 2,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      title: {
        display: true,
        text: `Distribution of Weather Risk Predictions (n = ${history.length})`,
      },
    },
  };

  return (
    <section className="charts-container">
      {/* Bar + line trend */}
      <div className="chart-card">
        <h2 className="chart-title">Predicted Delay Trend Across Inputs</h2>
        <div style={{ height: 420 }}>
          <Bar data={barLineData} options={barLineOptions} />
        </div>
      </div>

      {/* Pie chart for risk distribution */}
      <div className="chart-card pie-card">
        <div style={{ height: 360 }} className="pie-wrapper">
          <Pie data={pieData} options={pieOptions} />
        </div>
      </div>
    </section>
  );
}

export default ChartsPanel;