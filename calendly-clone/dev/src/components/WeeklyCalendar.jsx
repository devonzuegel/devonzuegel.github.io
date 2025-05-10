import React, { useState, useEffect, useRef, useCallback } from 'react';

function WeeklyCalendar({ events }) {
  const [weeks, setWeeks] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const scrollContainerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const todayColumnRef = useRef(null);

  // Time slot settings
  const dayStartHour = 8; // 8 AM
  const dayEndHour = 22; // 10 PM
  const slotDuration = 30; // 30 minutes per slot
  const daysToShow = 7; // One week
  const initialWeeksToLoad = 4; // Load 4 weeks initially

  // Format date as "Mon, May 10"
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time as "8:00 AM"
  const formatTime = (hour, minute) => {
    const time = new Date();
    time.setHours(hour, minute);
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Generate a week's worth of days starting from a given date
  const generateWeek = (startDate) => {
    const result = [];
    const weekStart = new Date(startDate);

    for (let i = 0; i < daysToShow; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + i);
      result.push(currentDate);
    }

    return result;
  };

  // Generate multiple weeks
  const generateWeeks = (startDate, weeksCount) => {
    const result = [];
    const weekStart = new Date(startDate);

    for (let i = 0; i < weeksCount; i++) {
      const weekStartDate = new Date(weekStart);
      weekStartDate.setDate(weekStart.getDate() + (i * 7));
      result.push({
        id: `week-${i}`,
        dates: generateWeek(weekStartDate)
      });
    }

    return result;
  };

  // Initialize with the first few weeks
  useEffect(() => {
    // Set start date to the beginning of the current week (Monday)
    const currentDate = new Date();
    const day = currentDate.getDay(); // 0 is Sunday, 1 is Monday
    const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday

    const weekStart = new Date(currentDate);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    setStartDate(weekStart);
    setWeeks(generateWeeks(weekStart, initialWeeksToLoad));
  }, []);

  // Handle infinite scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current || isLoading) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;

    // Load more weeks if we're close to the right edge
    if (scrollLeft + clientWidth > scrollWidth - 300) {
      setIsLoading(true);

      // Get the last week's last date
      const lastWeek = weeks[weeks.length - 1];
      const lastDate = lastWeek.dates[lastWeek.dates.length - 1];

      // Create new date for the next week
      const nextWeekStart = new Date(lastDate);
      nextWeekStart.setDate(lastDate.getDate() + 1);

      // Add more weeks
      setWeeks(prev => [
        ...prev,
        ...generateWeeks(nextWeekStart, 2) // Load 2 more weeks
      ]);

      setIsLoading(false);
    }
  };

  // Check if a time slot has an event and provide event details
  const getEventForTimeSlot = (date, hour, minute) => {
    if (!events || !Array.isArray(events)) return null;

    const slotStart = new Date(date);
    slotStart.setHours(hour, minute, 0, 0);

    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotStart.getMinutes() + slotDuration);

    const matchingEvent = events.find(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Check if the event overlaps with this time slot
      return (
        (eventStart < slotEnd && eventEnd > slotStart) &&
        event.summary.includes("AVAILABLE")
      );
    });

    if (!matchingEvent) return null;

    // Calculate if this is the first slot of the event
    const eventStart = new Date(matchingEvent.start);
    const isFirstSlot = (
      eventStart.getHours() === hour &&
      Math.abs(eventStart.getMinutes() - minute) < slotDuration
    );

    // Calculate event duration in slots
    const eventEnd = new Date(matchingEvent.end);
    const durationMs = eventEnd - eventStart;
    const durationSlots = Math.ceil(durationMs / (slotDuration * 60 * 1000));

    // Format time range for display
    const formattedStart = eventStart.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const formattedEnd = eventEnd.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return {
      ...matchingEvent,
      isFirstSlot,
      durationSlots,
      displayTime: `${formattedStart} - ${formattedEnd}`
    };
  };

  // Generate time slots for the day
  const generateTimeSlots = () => {
    const slots = [];
    const slotsPerHour = 60 / slotDuration;

    for (let hour = dayStartHour; hour < dayEndHour; hour++) {
      for (let minuteIndex = 0; minuteIndex < slotsPerHour; minuteIndex++) {
        const minute = minuteIndex * slotDuration;
        slots.push({ hour, minute });
      }
    }

    return slots;
  };

  // Get all time slots we need to display
  const timeSlots = generateTimeSlots();

  // Check if a date is today
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Navigation functions
  const navigatePrevious = (unit) => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const currentScrollPosition = container.scrollLeft;
    const columnWidth = 140; // Based on CSS min-width for day-column

    let scrollAmount = 0;

    switch(unit) {
      case 'week':
        scrollAmount = columnWidth * 7;
        break;
      case 'month':
        scrollAmount = columnWidth * 30;
        break;
      default:
        scrollAmount = columnWidth * 7;
    }

    container.scrollTo({
      left: Math.max(0, currentScrollPosition - scrollAmount),
      behavior: 'smooth'
    });
  };

  const navigateNext = (unit) => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const currentScrollPosition = container.scrollLeft;
    const columnWidth = 140; // Based on CSS min-width for day-column

    let scrollAmount = 0;

    switch(unit) {
      case 'week':
        scrollAmount = columnWidth * 7;
        break;
      case 'month':
        scrollAmount = columnWidth * 30;
        break;
      default:
        scrollAmount = columnWidth * 7;
    }

    container.scrollTo({
      left: currentScrollPosition + scrollAmount,
      behavior: 'smooth'
    });
  };

  // Scroll to today's column
  const scrollToToday = useCallback(() => {
    if (todayColumnRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const todayEl = todayColumnRef.current;
      const scrollLeft = todayEl.offsetLeft - (container.clientWidth / 2) + (todayEl.offsetWidth / 2);

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }, []);

  // Scroll to today when initially loaded
  useEffect(() => {
    if (weeks.length > 0) {
      scrollToToday();
    }
  }, [weeks, scrollToToday]);

  return (
    <div className="weekly-calendar">
      <div className="calendar-navigation">
        <div className="navigation-buttons">
          <div className="nav-button-container">
            <button
              className="nav-button"
              onClick={() => navigatePrevious('month')}
              aria-label="Previous Month"
            >
              &#171; {/* Double left arrow */}
              <span className="nav-tooltip">Previous Month</span>
            </button>
          </div>

          <div className="nav-button-container">
            <button
              className="nav-button"
              onClick={() => navigatePrevious('week')}
              aria-label="Previous Week"
            >
              &#8249; {/* Single left arrow */}
              <span className="nav-tooltip">Previous Week</span>
            </button>
          </div>

          <button
            className="today-button"
            onClick={scrollToToday}
          >
            Today
          </button>

          <div className="nav-button-container">
            <button
              className="nav-button"
              onClick={() => navigateNext('week')}
              aria-label="Next Week"
            >
              &#8250; {/* Single right arrow */}
              <span className="nav-tooltip">Next Week</span>
            </button>
          </div>

          <div className="nav-button-container">
            <button
              className="nav-button"
              onClick={() => navigateNext('month')}
              aria-label="Next Month"
            >
              &#187; {/* Double right arrow */}
              <span className="nav-tooltip">Next Month</span>
            </button>
          </div>
        </div>

        <div className="calendar-instructions">
          <p><small>Scroll horizontally to see more dates. <span className="green-highlight">Green blocks</span> indicate available time slots.</small></p>
        </div>
      </div>
      <div
        ref={scrollContainerRef}
        className="calendar-scroll-container"
        onScroll={handleScroll}
      >
        <table className="calendar-table">
          <thead>
            <tr>
              <th className="time-column">Time</th>
              {weeks.flatMap(week =>
                week.dates.map(date => {
                  const today = isToday(date);
                  return (
                    <th
                      key={date.toISOString()}
                      className={`day-column ${today ? 'today' : ''}`}
                      ref={today ? todayColumnRef : null}
                    >
                      {formatDate(date)}
                      {today && <span className="today-indicator">Today</span>}
                    </th>
                  );
                })
              )}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(({ hour, minute }) => (
              <tr key={`${hour}-${minute}`} className="time-slot-row">
                <td className="time-cell">
                  {minute === 0 && formatTime(hour, minute)}
                </td>

                {weeks.flatMap(week =>
                  week.dates.map(date => {
                    const eventDetails = getEventForTimeSlot(date, hour, minute);
                    const isAvailable = !!eventDetails;

                    return (
                      <td
                        key={`${date.toISOString()}-${hour}-${minute}`}
                        className={`slot-cell ${isAvailable ? 'available' : ''}`}
                        title={isAvailable ? `${eventDetails.summary}: ${eventDetails.displayTime}` : ''}
                      >
                        {isAvailable && (
                          <div className="event-indicator">
                            {eventDetails.isFirstSlot && (
                              <div className="event-time">
                                {eventDetails.displayTime}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default WeeklyCalendar;