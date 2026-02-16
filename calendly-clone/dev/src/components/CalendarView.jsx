import React, { useState, useEffect } from 'react';
import TimezoneSelector from './TimezoneSelector';
import WeeklyCalendar from './WeeklyCalendar';
import Spinner from './Spinner';
import { loadCalendarData, MOCK_CALENDAR_DATA } from '../utils/calendarService';
import { GOOGLE_CALENDAR_API_KEY } from '../config';

function CalendarView() {
  const [events, setEvents] = useState([]);
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTimezoneChange = (timezone) => {
    setSelectedTimezone(timezone);
    // No need to reload calendar, as we'll just rerender with new timezone
  };

  const handleLoadCalendar = async () => {
    setIsLoading(true);

    try {
      const allEvents = await loadCalendarData(GOOGLE_CALENDAR_API_KEY);

      // Filter for availability events
      const availabilityEvents = allEvents.filter(event =>
        event.summary.includes("AVAILABLE")
      );

      setEvents(availabilityEvents);
    } catch (error) {
      console.error('Calendar loading error:', error);
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
        <div className="loading-indicator">
          <Spinner />
          <div className="loading-text">Loading calendar data...</div>
        </div>
      ) : (
        events.length > 0 ? (
          <WeeklyCalendar
            events={events}
            timezone={selectedTimezone}
            onTimezoneChange={handleTimezoneChange}
          />
        ) : (
          <div className="loading-indicator">
            <Spinner />
            <div className="loading-text">Loading calendar data...</div>
          </div>
        )
      )}
    </div>
  );
}

export default CalendarView;