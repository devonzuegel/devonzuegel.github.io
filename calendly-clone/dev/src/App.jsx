import React, { useEffect } from 'react';
import CalendarView from './components/CalendarView';

function App() {
  useEffect(() => {
    // Set CSS variable for time column width
    document.documentElement.style.setProperty('--time-column-width', '65px');
  }, []);

  return (
    <div className="container">
      <div className="info-container">
        <p>If a time is <span className="highlight">highlighted</span> below, it means Devon is <i>probably</i> available for a call at that time.</p>
        <p>
          Send a calendar invite with context to <a href="mailto:devon@esmeralda.org">devon@esmeralda.org</a>, and she'll confirm ASAP!
        </p>
      </div>
      <CalendarView />
    </div>
  );
}

export default App;