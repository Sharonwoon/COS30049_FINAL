import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

// Populate the tooltip with description
const delayDefinitions = { 'No Delay': 'On time (0 min delay).', 'Minor': 'Small delay (1-30 min).', 'Major': 'Significant delay (> 30 min).' };

// Color map that links each category name to a specific color
const colorMap = { 'No Delay': '#4CAF50', 'Minor': '#FFC107', 'Major': '#F44336' };

const DoughnutChart = ({ data }) => {
  const svgRef = useRef(); // Hold references to the SVG and its parent div in the DOM
  const containerRef = useRef(); // Allows D3 to directly manipulate the specific elements

  useEffect(() => {
    // If there's no data, do nothing
    if (!data || data.length === 0) return;

    // --- Create and manage the tooltip element ---
    const tooltip = d3.select("body").append("div")
      .attr("class", "chart-tooltip") // Assign a class for styling in App.css
      .style("opacity", 0);           // Start invisible

    // --- Make the chart responsive ---
    const containerWidth = containerRef.current.clientWidth;
    const width = containerWidth;
    const height = containerWidth;
    const radius = Math.min(width, height) / 2 * 0.8;

    // --- D3 Drawing Logic ---
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Clear any previous chart drawings before re-rendering
    svg.selectAll("*").remove();

    // Create element to hold the chart and center it in the SVG
    const g = svg.append("g").attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Converts our data array into angles for drawing slices
    const pie = d3.pie().value(d => d.value).sort(null);
    // Creates the path for each slice (the doughnut shape)
    const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius);
    // Larger arc for the hover animation effect
    const arcHover = d3.arc().innerRadius(radius * 0.6).outerRadius(radius * 1.08);

    // Get coordinates from both mouse and touch events
    const getEventCoordinates = (event) => event.touches ? { x: event.touches[0].pageX, y: event.touches[0].pageY } : { x: event.pageX, y: event.pageY };

    // Bind the data to 'path' elements and draw each slice
    g.selectAll("path")
      .data(pie(data))
      .join("path")
        .attr("d", arc)
        .attr("fill", d => colorMap[d.data.label] || '#cccccc') 
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .style("cursor", "pointer")
        // --- Event Handlers ---
        .on("mouseover touchstart", function(event, d) {
          d3.select(this).transition().duration(200).attr("d", arcHover);
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip.html(`<div class="tooltip-label">${d.data.label}</div><div class="tooltip-value">Probability: ${d.data.value.toFixed(1)}%</div><div class="tooltip-definition">${delayDefinitions[d.data.label]}</div>`);
        })
        .on("mousemove touchmove", function(event) {
          const coords = getEventCoordinates(event);
          tooltip.style("left", `${coords.x + 15}px`).style("top", `${coords.y - 28}px`);
        })
        .on("mouseout touchend", function() {
          d3.select(this).transition().duration(200).attr("d", arc);
          tooltip.transition().duration(200).style("opacity", 0);
        });

    // Add percentage labels inside the slices.
    g.selectAll("text.percentage")
      .data(pie(data))
      .join("text")
        .attr("class", "percentage")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .style("font-size", `${Math.max(12, radius / 8)}px`) // Font size scales with chart size
        .style("font-weight", "bold")
        .style("pointer-events", "none") // Make text unclickable
        .text(d => d.data.value > 0 ? `${d.data.value.toFixed(0)}%` : ''); // Hide label if value is 0

    // --- Cleanup Function ---
    return () => {
      tooltip.remove();
    };

  }, [data]); 

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      {/* The chart legend */}
      <div className="chart-legend">
        {data && data.map((item) => (
          <div key={item.label} className="legend-item">
            <div className="legend-color-box" style={{ backgroundColor: colorMap[item.label] }}></div>
            <span className="legend-label">{item.label}</span>
          </div>
        ))}
      </div>
      
      {/* The SVG element that D3 will draw into */}
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default DoughnutChart;