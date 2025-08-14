import React, { useState, useEffect, useRef, useCallback } from 'react';
import TimezoneSelector from './TimezoneSelector';

function WeeklyCalendar({ events, timezone, onTimezoneChange }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [hoveredEvent, setHoveredEvent] = useState(null);

  // Navigation functions
  const navigatePrevious = () => {
    setWeekOffset(prev => prev - 1);
  };

  const navigateNext = () => {
    setWeekOffset(prev => prev + 1);
  };

  // Reset to current week
  const navigateToday = () => {
    setWeekOffset(0);
  };

  // Generate week days for the calendar with offset, starting from today
  const generateWeekDays = () => {
    // Get today's date in the user's selected timezone
    let today;

    if (timezone) {
      // Get current date in the selected timezone
      const options = { timeZone: timezone };
      const localTime = new Date().toLocaleString('en-US', options);
      today = new Date(localTime);
    } else {
      today = new Date();
    }

    const offsetDay = new Date(today);
    offsetDay.setDate(today.getDate() + (weekOffset * 7));

    const days = [];

    // Start from today instead of Sunday
    const firstDayOfWeek = new Date(offsetDay);

    for (let i = 0; i < 21; i++) {
      const date = new Date(firstDayOfWeek);
      date.setDate(firstDayOfWeek.getDate() + i);

      const day = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });

      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      days.push({
        date,
        display: day,
        isToday,
        dateString: date.toISOString().split('T')[0] // YYYY-MM-DD format
      });
    }

    return days;
  };

  const weekDays = generateWeekDays();

  // Function to check if an event belongs to a specific day and hour/half-hour
  const getEventForTimeSlot = (date, hourIncrement) => {
    if (!events || events.length === 0) return null;

    // Calculate the actual hour and minute (for 30-min increments)
    const hour = Math.floor(hourIncrement / 2);
    const minute = (hourIncrement % 2) * 30;

    // Create the date in the provided timezone
    const dayStart = new Date(date);
    dayStart.setHours(hour, minute, 0, 0);

    const dayEnd = new Date(dayStart);
    // Set end time 30 minutes later
    dayEnd.setHours(hour, minute + 30, 0, 0);

    // Convert dayStart and dayEnd to UTC timestamps (to compare with the ISO strings)
    const dayStartUTC = dayStart.getTime();
    const dayEndUTC = dayEnd.getTime();

    // Find events that overlap with this time slot
    const matchingEvent = events.find(event => {
      // Convert event times to the selected timezone
      const eventStartUTC = new Date(event.start).getTime();
      const eventEndUTC = new Date(event.end).getTime();

      // Get adjusted time according to selected timezone
      let eventStart, eventEnd;

      if (timezone) {
        // Use the selected timezone to create proper timezone-aware dates
        eventStart = new Date(new Date(event.start).toLocaleString('en-US', { timeZone: timezone }));
        eventEnd = new Date(new Date(event.end).toLocaleString('en-US', { timeZone: timezone }));
      } else {
        // Fall back to local timezone
        eventStart = new Date(event.start);
        eventEnd = new Date(event.end);
      }

      // Check if the event overlaps with this time slot
      return (eventStart < dayEnd && eventEnd > dayStart);
    });

    if (matchingEvent) {
      // Calculate how much of this 30-minute slot the event fills
      let eventStart, eventEnd;

      if (timezone) {
        eventStart = new Date(new Date(matchingEvent.start).toLocaleString('en-US', { timeZone: timezone }));
        eventEnd = new Date(new Date(matchingEvent.end).toLocaleString('en-US', { timeZone: timezone }));
      } else {
        eventStart = new Date(matchingEvent.start);
        eventEnd = new Date(matchingEvent.end);
      }

      // Calculate the overlap percentage with this time slot
      const slotStartTime = dayStart.getTime();
      const slotEndTime = dayEnd.getTime();
      const eventStartTime = eventStart.getTime();
      const eventEndTime = eventEnd.getTime();

      // Calculate start and end times for the overlap period
      const overlapStart = Math.max(slotStartTime, eventStartTime);
      const overlapEnd = Math.min(slotEndTime, eventEndTime);

      // Calculate percentage of the slot that's filled (0 to 1)
      const slotDuration = slotEndTime - slotStartTime;
      const overlapDuration = overlapEnd - overlapStart;
      const fillPercentage = overlapDuration / slotDuration;

      // Attach the fill percentage to the event object
      return {
        ...matchingEvent,
        fillPercentage
      };
    }

    return null;
  };

  // Calculate visible time range based on events
  const calculateVisibleTimeRange = () => {
    if (!events || events.length === 0) {
      // Default range: 8 AM to 6 PM (16 hours = 20 slots)
      return { startSlot: 16, endSlot: 35, totalSlots: 20 };
    }

    let earliestSlot = 48; // Start at end of day
    let latestSlot = 0;    // Start at beginning of day

    // Find the earliest and latest event times across all days
    weekDays.forEach(day => {
      for (let increment = 0; increment < 48; increment++) {
        const event = getEventForTimeSlot(day.date, increment);
        if (event) {
          earliestSlot = Math.min(earliestSlot, increment);
          latestSlot = Math.max(latestSlot, increment);
        }
      }
    });

    // If no events found, use default range
    if (earliestSlot === 48 && latestSlot === 0) {
      return { startSlot: 16, endSlot: 35, totalSlots: 20 };
    }

    // Add 1 hour (2 slots) buffer before and after
    let startSlot = Math.max(0, earliestSlot - 2);
    let endSlot = Math.min(47, latestSlot + 2);

    // Ensure minimum 6 hours (12 slots) are visible
    const currentRange = endSlot - startSlot + 1;
    if (currentRange < 12) {
      const slotsToAdd = 12 - currentRange;
      const addBefore = Math.floor(slotsToAdd / 2);
      const addAfter = slotsToAdd - addBefore;
      
      startSlot = Math.max(0, startSlot - addBefore);
      endSlot = Math.min(47, endSlot + addAfter);
      
      // If we hit the boundaries, adjust the other side
      if (startSlot === 0 && endSlot - startSlot + 1 < 12) {
        endSlot = Math.min(47, startSlot + 11);
      } else if (endSlot === 47 && endSlot - startSlot + 1 < 12) {
        startSlot = Math.max(0, endSlot - 11);
      }
    }

    const totalSlots = endSlot - startSlot + 1;
    return { startSlot, endSlot, totalSlots };
  };

  const { startSlot, endSlot, totalSlots } = calculateVisibleTimeRange();

  // Helper function to check if this is the start of a contiguous block
  const isStartOfContiguousBlock = (date, hourIncrement, dayIndex) => {
    if (!events || events.length === 0) return false;

    // Get the current event
    const currentEvent = getEventForTimeSlot(date, hourIncrement);
    if (!currentEvent) return false;

    // Check if the slot above has the same event
    const prevIncrement = hourIncrement - 1;
    if (prevIncrement >= 0) {
      const prevEvent = getEventForTimeSlot(date, prevIncrement);

      // If previous slot has the same event, this is not the start
      if (prevEvent && prevEvent.start === currentEvent.start && prevEvent.end === currentEvent.end) {
        return false;
      }
    }

    return true;
  };

  // Format event time according to selected timezone
  const formatEventTime = (dateString) => {
    let date;

    if (timezone) {
      // Format the time in the selected timezone
      const options = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: timezone };
      return new Date(dateString).toLocaleTimeString('en-US', options);
    } else {
      // Fall back to local timezone
      date = new Date(dateString);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

      return `${formattedHours}:${formattedMinutes} ${ampm}`;
    }
  };

  // Calculate current time indicator position respecting the selected timezone and visible range
  const getCurrentTimePosition = () => {
    let hours, minutes;

    if (timezone) {
      // Get current time in the selected timezone
      const localTime = new Date();
      const options = {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      };

      // Parse the time in the specified timezone
      const timeString = localTime.toLocaleString('en-US', options);
      const [hourStr, minuteStr] = timeString.split(':');

      hours = parseInt(hourStr, 10);
      minutes = parseInt(minuteStr, 10);
    } else {
      // Fall back to local timezone
      const now = new Date();
      hours = now.getHours();
      minutes = now.getMinutes();
    }

    // Convert current time to slot index
    const currentSlot = hours * 2 + (minutes >= 30 ? 1 : 0) + (minutes % 30) / 30;
    
    // Check if current time is within the visible range
    if (currentSlot < startSlot || currentSlot > endSlot) {
      return null; // Hide indicator if current time is outside visible range
    }

    // Calculate position as percentage of the visible range
    const relativeSlot = currentSlot - startSlot;
    const percentage = (relativeSlot / totalSlots) * 100;
    return `${percentage}%`;
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

        <div className="navigation-buttons" style={{display: "none"}}>
          <div className="nav-button-container">
            <button
              className="nav-button"
              onClick={navigatePrevious}
              aria-label="Previous Week"
            >
              &#8249; {/* Single left arrow */}
              <span className="nav-tooltip">Previous Week</span>
            </button>
          </div>

          <div className="nav-button-container">
            <button
              className="nav-button"
              onClick={navigateNext}
              aria-label="Next Week"
            >
              &#8250; {/* Single right arrow */}
              <span className="nav-tooltip">Next Week</span>
            </button>
          </div>
        </div>
      </div>

      <div className="calendar-container">
        {/* Sticky overlay that stays fixed while header scrolls underneath */}
        <div className="times-column-overlay"></div>
        {/* Main calendar grid */}
        <div className="calendar-scroll-container">
          
          {/* Sticky header table - inside scroll container */}
          <div className="calendar-header">
            <table className="header-table">
              <thead>
                <tr>
                  <th className="time-column-header-sticky"></th>
                  {weekDays.map((day, index) => (
                    <th key={index} className={`day-column ${day.isToday ? 'today' : ''}`}>
                      {day.isToday ? (
                        <span className="today-pill">{day.display}</span>
                      ) : (
                        day.display
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
          
          <div style={{display: 'flex'}}>
            {/* Time column (left side) */}
            <div className="time-column-container">
              <table className="time-column-table">
                <tbody>
                  {Array.from({ length: totalSlots }, (_, index) => {
                    const increment = startSlot + index;
                    const hour = Math.floor(increment / 2);
                    const minute = (increment % 2) * 30;
                    const showHour = minute === 0; // Only show hour text at the hour mark

                    return (
                      <tr key={increment} className="time-slot-row">
                        <td className="time-cell">
                          {showHour && (
                            <span className="time-text">
                              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calendar content */}
            <div style={{flex: 1, position: 'relative'}}>
              {/* Current time indicator - only shown on today's column and within visible range */}
              {weekDays.findIndex(day => day.isToday) !== -1 && getCurrentTimePosition() !== null && (
                <div
                  className="today-time-indicator"
                  style={{
                    top: `calc(${getCurrentTimePosition()})`,
                    left: `calc(${weekDays.findIndex(day => day.isToday)} * (100% / ${weekDays.length}))`,
                    width: `calc(100% / ${weekDays.length})`,
                    right: 'auto',
                    zIndex: 60
                  }}
                >
                  <div className="today-time-text">
                    {timezone
                      ? new Date().toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: timezone
                        })
                      : new Date().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                    }
                  </div>
                </div>
              )}

              <table className="calendar-table">
                <tbody>
              {Array.from({ length: totalSlots }, (_, index) => {
                const increment = startSlot + index;
                return (
                  <tr key={increment} className="time-slot-row">
                    {weekDays.map((day, dayIndex) => {
                      const event = getEventForTimeSlot(day.date, increment);
                      const isAvailable = !!event;
                      const isHovered = hoveredEvent &&
                                       hoveredEvent.start === (event?.start || null) &&
                                       hoveredEvent.end === (event?.end || null);

                      return (
                        <td
                          key={dayIndex}
                          className={`slot-cell ${isAvailable ? 'available' : ''} ${isHovered ? 'highlight-contiguous' : ''}`}
                        >
                          {isAvailable && (
                            <div
                              className={`event-indicator ${isHovered ? 'highlight-contiguous' : ''} ${event.fillPercentage < 0.4 ? 'short-event' : ''}`}
                              onMouseEnter={() => setHoveredEvent(event)}
                              onMouseLeave={() => setHoveredEvent(null)}
                              style={{
                                height: `${event.fillPercentage * 100}%`,
                                position: 'absolute',
                                top: '0',
                                width: '100%'
                              }}
                              title={`${formatEventTime(event.start)} - ${formatEventTime(event.end)}`}
                            >
                              {isStartOfContiguousBlock(day.date, increment, dayIndex) && (
                                <>
                                  {event.fillPercentage >= 0.2 && (
                                    <div className="event-availability-label">AVAILABLE</div>
                                  )}
                                  {(event.fillPercentage >= 0.5 || isHovered) && (
                                    <div className="event-time">
                                      {formatEventTime(event.start)} - {formatEventTime(event.end)}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* DEBUG: Display events data */}
      <div className="calendar-data-summary" style={{display: 'none'}}>
        <details>
          <summary>Events Data (Debug)</summary>
          <pre>{JSON.stringify(events, null, 2)}</pre>
        </details>
      </div>
    </div>
  );
}

export default WeeklyCalendar;