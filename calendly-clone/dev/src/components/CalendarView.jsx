import React, { useState, useEffect } from 'react';
import ProxySelector from './ProxySelector';
import { loadCalendarData, MOCK_CALENDAR_DATA } from '../utils/calendarService';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addWeeks, addMonths, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Custom view to show exactly 2 weeks
const CustomWeekView = {
  ...Views.WEEK,
  name: 'customWeek',
  title: (date) => 'Two Weeks', // Make title a function that returns a string
  navigate: (date, action) => {
    switch (action) {
      case 'PREV':
        return addWeeks(date, -2);
      case 'NEXT':
        return addWeeks(date, 2);
      default:
        return date;
    }
  },
  range: (date) => {
    // Create a range that spans exactly two weeks from the given date
    const start = startOfWeek(date);
    const end = addWeeks(start, 2);

    // Create an array of all dates in the range
    return eachDayOfInterval({ start, end: addWeeks(end, -1) }).map(day => ({
      start: startOfDay(day),
      end: endOfDay(day),
    }));
  }
};

function CalendarView() {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [selectedProxy, setSelectedProxy] = useState('https://api.allorigins.win/raw?url=');
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState(new Date());

  const handleProxyChange = (proxy) => {
    setSelectedProxy(proxy);
    handleLoadCalendar(); // Reload calendar when proxy changes
  };

  const handleLoadCalendar = async () => {
    setIsLoading(true);

    try {
      const events = MOCK_CALENDAR_DATA; //await loadCalendarData(selectedProxy); // TODO: Put this back in to fetch real data

      // Filter out past events - only include events that end after current time
      const now = new Date();
      const currentAndFutureEvents = events.filter(event => {
        const eventEndTime = new Date(event.end);
        return eventEndTime >= now; // Event ends in the future or is ongoing
      });

      // Filter events where summary is exactly "DEVON AVAILABLE"
      const devonAvailableEvents = currentAndFutureEvents.filter(event =>
        event.summary === "DEVON AVAILABLE"
      );

      // Format events for the Calendar component
      const formattedEvents = devonAvailableEvents.map(event => ({
        title: 'Available',
        start: new Date(event.start),
        end: new Date(event.end),
        allDay: false,
        resource: event
      }));

      setCalendarEvents(formattedEvents);

      // Set initial date to the date of first upcoming event if events exist
      if (formattedEvents.length > 0) {
        // Sort events by start date
        formattedEvents.sort((a, b) => a.start - b.start);
        // Set the calendar date to the start date of the first event
        setDate(startOfWeek(formattedEvents[0].start));
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load calendar data immediately when component mounts
  useEffect(() => {
    handleLoadCalendar();
  }, []);

  // Handle date change when navigating
  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  // Generate custom components for the calendar view
  const customDayPropGetter = (date) => {
    const today = new Date();
    if (date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()) {
      return {
        className: 'current-day',
        style: {
          backgroundColor: 'rgba(54, 125, 162, 0.1)',
        }
      };
    }
    return {};
  };

  const customEventPropGetter = (event) => {
    return {
      style: {
        backgroundColor: '#2c6a8c',
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  return (
    <div>
      <div className="calendar-controls" style={{display: "none"}}>
        <button onClick={handleLoadCalendar} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh Calendar'}
        </button>
        <ProxySelector selectedProxy={selectedProxy} onChange={handleProxyChange} />
      </div>

      <div className="calendar-container" style={{ height: '600px', overflow: 'auto' }}>
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          date={date}
          onNavigate={handleNavigate}
          defaultView="week"
          views={{
            month: true,
            week: true,
          }}
          dayPropGetter={customDayPropGetter}
          eventPropGetter={customEventPropGetter}
          style={{ height: '100%' }}
          toolbar={true}
          scrollToTime={new Date(new Date().setHours(8, 0, 0, 0))}
          length={14} // 2 weeks (14 days)
          formats={{
            timeGutterFormat: 'h a',
            eventTimeRangeFormat: ({ start, end }) =>
              `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
            dayFormat: 'M/d',
          }}
        />
      </div>
    </div>
  );
}

export default CalendarView;