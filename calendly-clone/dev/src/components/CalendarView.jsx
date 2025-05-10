import React, { useState } from 'react';
import ProxySelector from './ProxySelector';
import CalendarOutput from './CalendarOutput';
import { loadCalendarData } from '../utils/calendarService';

function CalendarView() {
  const [output, setOutput] = useState('');
  const [selectedProxy, setSelectedProxy] = useState('https://api.allorigins.win/raw?url=');
  const [isLoading, setIsLoading] = useState(false);

  const handleProxyChange = (proxy) => {
    setSelectedProxy(proxy);
  };

  const handleLoadCalendar = async () => {
    setIsLoading(true);
    setOutput('Loading...');

    try {
      const events = await loadCalendarData(selectedProxy);
      setOutput(JSON.stringify(events, null, 2));
    } catch (error) {
      setOutput(`Error: ${error.message}\n\nTry a different proxy from the dropdown menu.\n\nDebug information has been logged to the console.`);
      console.error('Full error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="calendar-controls">
        <button onClick={handleLoadCalendar} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load Calendar'}
        </button>
        <ProxySelector selectedProxy={selectedProxy} onChange={handleProxyChange} />
      </div>
      <CalendarOutput output={output} />
    </div>
  );
}

export default CalendarView;