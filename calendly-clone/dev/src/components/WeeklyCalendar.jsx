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

  // Generate week days for the calendar with offset
  const generateWeekDays = () => {
    const today = new Date();
    const offsetDay = new Date(today);
    offsetDay.setDate(today.getDate() + (weekOffset * 7));

    const days = [];

    // Start from Sunday of the current week with offset
    const firstDayOfWeek = new Date(offsetDay);
    const dayOfWeek = offsetDay.getDay(); // 0 = Sunday, 6 = Saturday
    firstDayOfWeek.setDate(offsetDay.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
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

  // Function to check if an event belongs to a specific day and hour
  const getEventForTimeSlot = (date, hour) => {
    if (!events || events.length === 0) return null;

    const dayStart = new Date(date);
    dayStart.setHours(hour, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(hour + 1, 0, 0, 0);

    // Find events that overlap with this time slot
    return events.find(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Check if the event overlaps with this time slot
      return (eventStart < dayEnd && eventEnd > dayStart);
    });
  };

  // Format event time
  const formatEventTime = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  // Calculate current time indicator position
  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    // Calculate position as percentage of day (24 hours)
    const percentage = ((hours + minutes / 60) / 24) * 100;
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

          <button className="today-button" onClick={navigateToday}>
            Today
          </button>
        </div>

        <div className="navigation-buttons">
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
        {/* Time column (left side) */}
        <div className="time-column-container">
          <table className="time-column-table">
            <thead>
              <tr>
                <th className="time-column-header"></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 24 }, (_, hour) => (
                <tr key={hour} className="time-slot-row">
                  <td className="time-cell">
                    <span className="time-text">
                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Main calendar grid */}
        <div className="calendar-scroll-container">
          {/* Current time indicator - only shown if current week includes today */}
          {weekDays.some(day => day.isToday) && (
            <div
              className="today-time-indicator"
              style={{
                top: getCurrentTimePosition(),
                left: 0,
                right: 0,
                zIndex: 60
              }}
            >
              <div className="today-time-text">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          <table className="calendar-table">
            <thead>
              <tr>
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
            <tbody>
              {Array.from({ length: 24 }, (_, hour) => (
                <tr key={hour} className="time-slot-row">
                  {weekDays.map((day, dayIndex) => {
                    const event = getEventForTimeSlot(day.date, hour);
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
                            className={`event-indicator ${isHovered ? 'highlight-contiguous' : ''}`}
                            onMouseEnter={() => setHoveredEvent(event)}
                            onMouseLeave={() => setHoveredEvent(null)}
                          >
                            <div className="event-availability-label">AVAILABLE</div>
                            <div className="event-time">
                              {formatEventTime(event.start)} - {formatEventTime(event.end)}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEBUG: Display events data */}
      <div className="calendar-data-summary">
        <details>
          <summary>Events Data (Debug)</summary>
          <pre>{JSON.stringify(events, null, 2)}</pre>
        </details>
      </div>
    </div>
  );
}

export default WeeklyCalendar;