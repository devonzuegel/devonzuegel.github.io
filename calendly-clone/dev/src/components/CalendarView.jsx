import React, { useState, useEffect } from 'react';
import ProxySelector from './ProxySelector';
import CalendarOutput from './CalendarOutput';
import { loadCalendarData, MOCK_CALENDAR_DATA } from '../utils/calendarService';

function CalendarView() {
  const [output, setOutput] = useState('');
  const [selectedProxy, setSelectedProxy] = useState('https://api.allorigins.win/raw?url=');
  const [isLoading, setIsLoading] = useState(false);

  const handleProxyChange = (proxy) => {
    setSelectedProxy(proxy);
    handleLoadCalendar(); // Reload calendar when proxy changes
  };

  const handleLoadCalendar = async () => {
    setIsLoading(true);
    setOutput('Loading...');

    try {
      const events = MOCK_CALENDAR_DATA; //await loadCalendarData(selectedProxy); // TODO: Put this back in to fetch real data

      // Filter out past events - only include events that end after current time
      const now = new Date();
      const currentAndFutureEvents = events.filter(event => {
        const eventEndTime = new Date(event.end);
        return eventEndTime >= now; // Event ends in the future or is ongoing
      });

      setOutput(JSON.stringify(currentAndFutureEvents, null, 2));
    } catch (error) {
      setOutput(`Error: ${error.message}\n\nTry a different proxy from the dropdown menu.\n\nDebug information has been logged to the console.`);
      console.error('Full error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load calendar data immediately when component mounts
  useEffect(() => {
    handleLoadCalendar();
  }, []);

  return (
    <div>
      <div className="calendar-controls">
        <button onClick={handleLoadCalendar} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh Calendar'}
        </button>
        <ProxySelector selectedProxy={selectedProxy} onChange={handleProxyChange} />
      </div>
      <CalendarOutput output={output} />
    </div>
  );
}

export default CalendarView;