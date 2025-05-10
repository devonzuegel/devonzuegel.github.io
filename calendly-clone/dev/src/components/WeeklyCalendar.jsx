import React, { useState, useEffect, useRef, useCallback } from 'react';
import TimezoneSelector from './TimezoneSelector';

function WeeklyCalendar({ events, timezone, onTimezoneChange }) {
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
    if (!date) return "";
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: timezone || undefined
    });
  };

  // Format time as "8am"
  const formatTime = (hour, minute) => {
    const time = new Date();
    time.setHours(hour, minute);

    // Format without minutes if they're zero
    if (minute === 0) {
      return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true,
        timeZone: timezone || undefined
      }).replace(':00', '').toLowerCase().replace(' ', '');
    }

    // Include minutes otherwise
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone || undefined
    }).toLowerCase().replace(' ', '');
  };

  // Convert a date from ISO string to a Date object preserving the exact same point in time
  // This function doesn't actually change the time, just ensures we have a proper Date object
  const parseISODate = (isoString) => {
    return new Date(isoString);
  };

  // Format a date for display in the target timezone
  const formatTimeInTimezone = (date, options = {}) => {
    if (!date) return "";

    const defaultOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone || undefined
    };

    const formattedTime = date.toLocaleTimeString('en-US', { ...defaultOptions, ...options });

    // Format as "11am" if no minutes, or "11:30am" if there are minutes
    if (formattedTime.includes(':00')) {
      return formattedTime.replace(':00', '').toLowerCase().replace(' ', '');
    } else {
      return formattedTime.toLowerCase().replace(' ', '');
    }
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

  // Find the first day with available events
  const findFirstDayWithAvailability = useCallback(() => {
    if (!events || !Array.isArray(events) || events.length === 0) return null;

    // Sort events by start date
    const sortedEvents = [...events].sort((a, b) =>
      new Date(a.start) - new Date(b.start)
    );

    // Return the date of the first available event
    const firstEvent = sortedEvents[0];
    return firstEvent ? new Date(firstEvent.start) : null;
  }, [events]);

  // Initialize with the first few weeks when timezone changes or events update
  useEffect(() => {
    // Set default start date to the beginning of the current week (Monday)
    let initialDate = new Date();
    const day = initialDate.getDay(); // 0 is Sunday, 1 is Monday
    const diff = initialDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday

    // Calculate initial weeks starting point
    const weekStart = new Date(initialDate);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    // Start 2 weeks before current date to allow scrolling backwards
    const twoWeeksBack = new Date(weekStart);
    twoWeeksBack.setDate(weekStart.getDate() - 14);

    setStartDate(twoWeeksBack);
    setWeeks(generateWeeks(twoWeeksBack, initialWeeksToLoad + 2)); // Load extra weeks
  }, [timezone]);

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

      // Re-sync row heights after loading new content
      setTimeout(syncRowHeights, 50);

      setIsLoading(false);
    }
  };

  // Check if a time slot has an event and provide event details
  const getEventForTimeSlot = (date, hour, minute) => {
    if (!events || !Array.isArray(events)) return null;

    // Create the slot start and end times for the current day/hour/minute
    const slotStart = new Date(date);
    slotStart.setHours(hour, minute, 0, 0);

    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotStart.getMinutes() + slotDuration);

    // Find event that overlaps with this time slot
    const matchingEvent = events.find(event => {
      // Parse event times
      const eventStart = parseISODate(event.start);
      const eventEnd = parseISODate(event.end);

      // Check if the event overlaps with this time slot
      // This works because all times are in UTC internally
      return (
        (eventStart < slotEnd && eventEnd > slotStart) &&
        event.summary.includes("AVAILABLE")
      );
    });

    if (!matchingEvent) return null;

    // Parse event times
    const eventStart = parseISODate(matchingEvent.start);
    const eventEnd = parseISODate(matchingEvent.end);

    // Calculate if this is the first slot of the event
    const isFirstSlot = (
      eventStart.getHours() === hour &&
      Math.abs(eventStart.getMinutes() - minute) < slotDuration
    );

    // Calculate event duration in slots
    const durationMs = eventEnd - eventStart;
    const durationSlots = Math.ceil(durationMs / (slotDuration * 60 * 1000));

    // Format time range for display using the target timezone
    const formattedStart = formatTimeInTimezone(eventStart);
    const formattedEnd = formatTimeInTimezone(eventEnd);

    // Format as "11am - 12pm" or "10-11:30am" when both are am/pm
    let displayTime;

    // Check if both times are in the same am/pm period
    const startAmPm = formattedStart.match(/[ap]m/)[0];
    const endAmPm = formattedEnd.match(/[ap]m/)[0];

    if (startAmPm === endAmPm) {
      // Both times are AM or both are PM, use compact format
      // Extract just the hour and minute parts
      const startHour = formattedStart.replace(/[ap]m/, '');
      const endHour = formattedEnd.replace(/[ap]m/, '');

      // Use shared am/pm suffix
      displayTime = `${startHour}-${endHour}${startAmPm}`;
    } else {
      // Different periods (one am, one pm), use standard format
      displayTime = `${formattedStart} - ${formattedEnd}`;
    }

    return {
      ...matchingEvent,
      isFirstSlot,
      durationSlots,
      displayTime
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

  // Function to sync table row heights
  const syncRowHeights = () => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        // This forces a pixel-perfect alignment between tables
        const timeRows = document.querySelectorAll('.time-column-table tr');
        const calendarRows = document.querySelectorAll('.calendar-table tr');

        if (timeRows.length === calendarRows.length) {
          for (let i = 0; i < timeRows.length; i++) {
            const timeRowHeight = calendarRows[i].offsetHeight;
            if (timeRowHeight > 0) {
              timeRows[i].style.height = `${timeRowHeight}px`;
            }
          }
        }
      }, 100); // Small delay to ensure DOM is ready
    }
  };

  // Get all time slots we need to display
  const timeSlots = generateTimeSlots();

  // Check if a date is today
  const isToday = (date) => {
    if (!date) return false;
    
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

      // Get the time column width
      const timeColumnWidth = document.querySelector('.time-column-container')?.offsetWidth || 80;
      const extraSpacerWidth = timeColumnWidth * 1.5; // Just to make it visually a little nicer

      // Position today as the second column
      const scrollLeft = todayEl.offsetLeft - extraSpacerWidth;

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }, []);

  // Reference to first availability column
  const firstAvailabilityRef = useRef(null);

  // Scroll to the first availability
  const scrollToFirstAvailability = useCallback(() => {
    if (firstAvailabilityRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const targetEl = firstAvailabilityRef.current;

      // Get the time column width
      const timeColumnWidth = document.querySelector('.time-column-container')?.offsetWidth || 80;
      const extraSpacerWidth = timeColumnWidth * 1.5; // Just to make it visually a little nicer

      // Set scroll position to show first availability as second column
      // We don't need to subtract the time column width anymore since it's outside the scroll container
      const scrollLeft = targetEl.offsetLeft - extraSpacerWidth;

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    } else {
      // If no availability, scroll to today
      scrollToToday();
    }
  }, [scrollToToday]);

  // Track if we've found the first day with availability
  const [firstAvailabilityDate, setFirstAvailabilityDate] = useState(null);

  // Find first availability when events change
  useEffect(() => {
    const firstDay = findFirstDayWithAvailability();
    setFirstAvailabilityDate(firstDay);
  }, [events, findFirstDayWithAvailability]);

  // Scroll to first availability (or today) when initially loaded
  useEffect(() => {
    if (weeks.length > 0 && events.length > 0) {
      scrollToFirstAvailability();
    } else if (weeks.length > 0) {
      scrollToToday();
    }

    // Force alignment of row heights
    syncRowHeights();
  }, [weeks, events, scrollToFirstAvailability, scrollToToday]);

  // Re-sync row heights on resize
  useEffect(() => {
    const handleResize = () => {
      syncRowHeights();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Format timezone for display
  const getTimezoneDisplay = () => {
    if (!timezone) return "Local Timezone";
    
    try {
      // Get a sample date in this timezone
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
      });
      
      // Extract the timezone abbreviation (like EST, PST)
      const tzAbbr = formatter.formatToParts(now)
        .find(part => part.type === 'timeZoneName')?.value || timezone;
      
      return `${timezone.split('/').pop().replace(/_/g, ' ')} (${tzAbbr})`;
    } catch (error) {
      console.error('Error formatting timezone display:', error);
      return timezone;
    }
  };

  return (
    <div className="weekly-calendar">
      <div className="calendar-navigation">
        <div className="navigation-container">
          <div className="timezone-container">
            <TimezoneSelector
              selectedTimezone={timezone}
              onTimezoneChange={onTimezoneChange}
            />
          </div>
          </div>

          <div className="navigation-buttons">
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

            {/* {events.length > 0 && (
              <button
                className="first-availability-button"
                onClick={scrollToFirstAvailability}
                title="Scroll to first available day"
              >
                First Available
              </button>
            )} */}

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
          </div>

       {/*  <div className="calendar-instructions">
          <p><small>Scroll horizontally to see more dates. <span className="green-highlight">Green blocks</span> indicate available time slots.</small></p>
        </div> */}
      </div>
      <div className="calendar-container">
        <div className="time-column-container">
          <table className="time-column-table">
            <thead>
              <tr>
                <th className="time-column-header">{getTimezoneDisplay()}</th>
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(({ hour, minute }) => (
                <tr key={`time-${hour}-${minute}`} className="time-slot-row">
                  <td className="time-cell">
                    {minute === 0 && formatTime(hour, minute)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          ref={scrollContainerRef}
          className="calendar-scroll-container"
          onScroll={handleScroll}
        >
          <table className="calendar-table">
            <thead>
              <tr>
                {weeks.flatMap(week =>
                  week.dates.map(date => {
                    const today = isToday(date);
                    const isFirstAvailability = firstAvailabilityDate &&
                      date.getFullYear() === firstAvailabilityDate.getFullYear() &&
                      date.getMonth() === firstAvailabilityDate.getMonth() &&
                      date.getDate() === firstAvailabilityDate.getDate();

                    return (
                      <th
                        key={date.toISOString()}
                        className={`day-column ${today ? 'today' : ''}`}
                        ref={isFirstAvailability ? firstAvailabilityRef : today ? todayColumnRef : null}
                      >
                        {formatDate(date)}
                      </th>
                    );
                  })
                )}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(({ hour, minute }) => (
                <tr key={`${hour}-${minute}`} className="time-slot-row">
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
    </div>
  );
}

export default WeeklyCalendar;