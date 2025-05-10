import React, { useState, useEffect } from 'react';
import ProxySelector from './ProxySelector';
import TimezoneSelector from './TimezoneSelector';
import WeeklyCalendar from './WeeklyCalendar';
import { loadCalendarData, MOCK_CALENDAR_DATA } from '../utils/calendarService';

function CalendarView() {
  const [events, setEvents] = useState([]);
  const [selectedProxy, setSelectedProxy] = useState('https://api.allorigins.win/raw?url=');
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleProxyChange = (proxy) => {
    setSelectedProxy(proxy);
    handleLoadCalendar(); // Reload calendar when proxy changes
  };

  const handleTimezoneChange = (timezone) => {
    setSelectedTimezone(timezone);
    // No need to reload calendar, as we'll just rerender with new timezone
  };

  const handleLoadCalendar = async () => {
    setIsLoading(true);

    try {
      const allEvents = await loadCalendarData(selectedProxy); // TODO: Put this back in to fetch real data

      // Filter out past events - only include events that end after current time
      const now = new Date();
      const currentAndFutureEvents = allEvents.filter(event => {
        const eventEndTime = new Date(event.end);
        return eventEndTime >= now; // Event ends in the future or is ongoing
      });

      // Filter for availability events
      const availabilityEvents = currentAndFutureEvents.filter(event =>
        event.summary.includes("AVAILABLE")
      );

      setEvents(availabilityEvents);
    } catch (error) {
      console.error('Calendar loading error:', error);
      // Still set events to an empty array on error to avoid UI breakage
      setEvents([]);
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
      {isLoading ? (
        <div className="loading-indicator">Loading calendar data...</div>
      ) : (
        events.length > 0 ? (
          <WeeklyCalendar
            events={events}
            timezone={selectedTimezone}
            onTimezoneChange={handleTimezoneChange}
          />
        ) : (
          <div className="loading-indicator">
            Loading calendar data...
          </div>
        )
      )}
    </div>
  );
}

export default CalendarView;