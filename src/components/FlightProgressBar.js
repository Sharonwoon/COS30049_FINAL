import React, { useState, useEffect } from 'react';

const FlightProgressBar = ({ status }) => {
  const [isAnimating, setIsAnimating] = useState(false); // Use react state to control when the animation should start

  useEffect(() => {
    // A tiny delay (10ms) is used 
    const timer = setTimeout(() => {
      setIsAnimating(true); // Update the state and triggers the css transition to start the bar grow
    }, 10); // To ensure the browser first renders the bar at 0% width

    // Clears the timer if the component is unmounted before the timeout finishes.
    return () => clearTimeout(timer);
  }, []); // This effect runs only once on mount

  // If no status, don't render anything
  if (!status) {
    return null;
  }

  // Determine the correct CSS class for the animation speed
  const getAnimationClass = () => {
    switch (status) {
      case 'No Delay': return 'chart3-progress-bar--fast';
      case 'Minor': return 'chart3-progress-bar--medium';
      case 'Major': return 'chart3-progress-bar--slow';
      default: return '';
    }
  };

  // Combine all necessary classes 
  const barFillClasses = `chart3-progress-bar-fill ${getAnimationClass()} ${isAnimating ? 'is-animating' : ''}`;

  return (
    <div className="chart3-progress-bar-container">
      <div className="chart3-progress-bar-track">  
        <div className={barFillClasses}>
          <div className="chart3-airplane-icon">✈️</div>
        </div>
      </div>
    </div>
  );
};

export default FlightProgressBar;