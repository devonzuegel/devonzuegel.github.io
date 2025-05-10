import React from 'react';
import CalendarView from './components/CalendarView';

function App() {
  return (
    <div className="container">
      <div>This is a test!</div>
      <div>This is a test!</div>
      <div>This is a test!</div>
      <div>This is a test!</div>
      <div>This is a test!</div>
      <br/>
      <div className="info-container" style={{ border: '10px solid red', padding: '20px', borderRadius: '8px' }}>
        <p>If a time shows up on the calendar below, it means Devon is <i>probably</i> available for a call at that time.</p>
        <p>
          Send a calendar invite with context to <a href="mailto:devon@esmeralda.org">devon@esmeralda.org</a>, and she'll confirm ASAP!
        </p>
      </div>
      <br />
      <CalendarView />
    </div>
  );
}

export default App;