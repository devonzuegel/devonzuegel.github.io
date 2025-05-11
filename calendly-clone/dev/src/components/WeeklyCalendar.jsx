import React, { useState, useEffect, useRef, useCallback } from 'react';
import TimezoneSelector from './TimezoneSelector';

function WeeklyCalendar({ events, timezone, onTimezoneChange }) {
  const [weeks, setWeeks] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const scrollContainerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const todayColumnRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [highlightedEventId, setHighlightedEventId] = useState(null);

  // Convert a date from ISO string to a Date object preserving the exact same point in time
  // This function doesn't actually change the time, just ensures we have a proper Date object
  const parseISODate = (isoString) => {
    return new Date(isoString);
  };

  // Calculate earliest start time and latest end time
  const findAvailableTimeRange = useCallback(() => {
    if (!events || !Array.isArray(events) || events.length === 0) {
      return { startHour: 8, endHour: 18 }; // Default 8 AM to 6 PM
    }

    // Find the earliest and latest events that contain "AVAILABLE" in the summary
    let earliestStartHour = 24; // Initialize to end of day
    let latestEndHour = 0;  // Initialize to start of day
    
    events.forEach(event => {
      if (event.summary.includes("AVAILABLE")) {
        // Check start time
        const eventStart = parseISODate(event.start);
        const startHour = eventStart.getHours();
        
        // Update if this event starts earlier than the current earliest
        if (startHour < earliestStartHour) {
          earliestStartHour = startHour;
        }
        
        // Check end time - we want the exact ending hour and minute
        const eventEnd = parseISODate(event.end);
        
        // Get the hour and fractional part representing minutes (e.g., 6:30 PM would be 18.5)
        const endHourExact = eventEnd.getHours() + (eventEnd.getMinutes() / 60);
        
        // Update if this event ends later than the current latest
        if (endHourExact > latestEndHour) {
          latestEndHour = endHourExact;
        }
      }
    });

    // If no available events found, default to 8 AM - 6 PM
    if (earliestStartHour === 24 || latestEndHour === 0) {
      return { startHour: 8, endHour: 18 };
    }

    // Convert the exact end hour back to a whole hour for display
    // Ceiling to the next hour if there are any minutes
    const latestEndWholeHour = Math.ceil(latestEndHour);
    
    // Return 1 hour before earliest start and 1 hour after latest end (with reasonable limits)
    return {
      startHour: Math.max(7, earliestStartHour - 1),  // Minimum start at 7 AM
      endHour: Math.min(22, latestEndWholeHour + 1)   // Maximum end at 10 PM, 1 hour after latest
    };
  }, [events]);

  // Get time range
  const timeRange = findAvailableTimeRange();
  
  // Time slot settings
  const dayStartHour = timeRange.startHour; // Show 1 hour before earliest available time
  const dayEndHour = timeRange.endHour; // Show 1 hour after latest available time
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

  // Format time as "8am EDT"
  const formatTime = (hour, minute) => {
    const time = new Date();
    time.setHours(hour, minute);

    // Get the timezone abbreviation using our mapping function
    const tzAbbr = timezone ? getTimezoneAbbreviation(timezone) : '';

    // Format without minutes if they're zero
    if (minute === 0) {
      const formattedTime = time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true,
        timeZone: timezone || undefined
      }).replace(':00', '').toLowerCase().replace(' ', '');

      return formattedTime;
      // Include timezone abbreviation only if it exists
      return tzAbbr ? `${formattedTime} ${tzAbbr}` : formattedTime;
    }

    // Include minutes otherwise
    const formattedTime = time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone || undefined
    }).toLowerCase().replace(' ', '');

    // Include timezone abbreviation only if it exists
    return tzAbbr ? `${formattedTime} ${tzAbbr}` : formattedTime;
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

    // Get the timezone abbreviation using our mapping function
    const tzAbbr = timezone ? getTimezoneAbbreviation(timezone) : '';

    const formattedTime = date.toLocaleTimeString('en-US', { ...defaultOptions, ...options });

    // Format as "11am EDT" if no minutes, or "11:30am EDT" if there are minutes
    let timeStr;
    if (formattedTime.includes(':00')) {
      timeStr = formattedTime.replace(':00', '').toLowerCase().replace(' ', '');
    } else {
      timeStr = formattedTime.toLowerCase().replace(' ', '');
    }

    // Include timezone abbreviation only if it exists
    return tzAbbr ? `${timeStr} ${tzAbbr}` : timeStr;
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

  // Find the last day with available events
  const findLastDayWithAvailability = useCallback(() => {
    if (!events || !Array.isArray(events) || events.length === 0) return null;

    // Filter only events containing "AVAILABLE"
    const availableEvents = events.filter(event => event.summary.includes("AVAILABLE"));

    if (availableEvents.length === 0) return null;

    // Sort events by end date
    const sortedEvents = [...availableEvents].sort((a, b) =>
      new Date(b.end) - new Date(a.end)
    );

    // Return the date of the last available event
    const lastEvent = sortedEvents[0];
    const lastDate = lastEvent ? new Date(lastEvent.end) : null;

    // If we have a last date, add one day to it
    if (lastDate) {
      const dayAfterLast = new Date(lastDate);
      dayAfterLast.setDate(lastDate.getDate() + 1);
      // Set to midnight
      dayAfterLast.setHours(0, 0, 0, 0);
      return dayAfterLast;
    }

    return null;
  }, [events]);

  // Initialize with the appropriate weeks when timezone changes or events update
  useEffect(() => {
    // Set start date to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setStartDate(today);

    // Find the last day with availability if events are loaded
    const lastDay = findLastDayWithAvailability();

    if (lastDay) {
      // Calculate how many weeks we need to show up to the last availability date + 1 day
      const diffTime = Math.abs(lastDay - today);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const weeksNeeded = Math.ceil(diffDays / 7);

      // Load at least initialWeeksToLoad, but more if needed to show up to lastDay
      const weeksToLoad = Math.max(initialWeeksToLoad, weeksNeeded);
      setWeeks(generateWeeks(today, weeksToLoad));
    } else {
      // If no events or last day couldn't be determined, load default number of weeks
      setWeeks(generateWeeks(today, initialWeeksToLoad));
    }
  }, [timezone, findLastDayWithAvailability, initialWeeksToLoad]);

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

      // Only add more weeks if we haven't reached the last availability date + 1 day
      if (!lastAvailabilityDatePlusOne ||
          (nextWeekStart <= lastAvailabilityDatePlusOne)) {
        // Add more weeks
        setWeeks(prev => [
          ...prev,
          ...generateWeeks(nextWeekStart, 2) // Load 2 more weeks
        ]);

        // Re-sync row heights after loading new content
        setTimeout(syncRowHeights, 50);
      }

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

    // Calculate if this is the last slot of the event
    const isLastSlot = (
      eventEnd.getHours() === hour &&
      Math.abs(eventEnd.getMinutes() - (minute + slotDuration)) <= slotDuration
    );

    // Calculate event duration in slots
    const durationMs = eventEnd - eventStart;
    const durationSlots = Math.ceil(durationMs / (slotDuration * 60 * 1000));

    // Determine if this is a short event that may be too small to show both AVAILABLE and time
    // Time required is in milliseconds - 45 minutes = 45 * 60 * 1000ms
    const isShortEvent = durationMs < 45 * 60 * 1000; // shorter than 45 minutes (30min slot + 15min buffer)

    // Calculate the fill percentage for this specific time slot
    // This handles cases where an event doesn't align with 30-minute slots
    // For vertical splitting, we show the percentage from top to bottom of the cell
    let fillPercentage = 100; // Default to full cell

    // Check if we're in the last slot of an event and the event doesn't end exactly on a slot boundary
    if (
      eventEnd.getHours() === hour &&
      Math.floor(eventEnd.getMinutes() / slotDuration) * slotDuration === minute &&
      eventEnd.getMinutes() % slotDuration !== 0
    ) {
      // Calculate what percentage of this slot the event fills (from top down)
      fillPercentage = (eventEnd.getMinutes() % slotDuration) / slotDuration * 100;
    }
    // Check if we're in the first slot of an event and the event doesn't start exactly on a slot boundary
    else if (
      eventStart.getHours() === hour &&
      eventStart.getMinutes() > minute &&
      eventStart.getMinutes() < minute + slotDuration
    ) {
      // Calculate what percentage of this slot the event fills (from top down)
      fillPercentage = (minute + slotDuration - eventStart.getMinutes()) / slotDuration * 100;
    }

    // Format time range for display using the target timezone
    const formattedStart = formatTimeInTimezone(eventStart);
    const formattedEnd = formatTimeInTimezone(eventEnd);

    // Format as "11am EDT - 12pm EDT" or "10-11:30am EDT" when both are am/pm
    let displayTime;

    // Extract timezone abbreviation - should be the same for both times since they're in the same timezone
    const tzAbbr = formattedStart.split(' ').pop();

    // Check if both times are in the same am/pm period
    const startAmPmMatch = formattedStart.match(/([ap]m)/);
    const endAmPmMatch = formattedEnd.match(/([ap]m)/);

    if (!startAmPmMatch || !endAmPmMatch) {
      // Fallback if regex doesn't match
      displayTime = `${formattedStart} - ${formattedEnd}`;
    } else {
      const startAmPm = startAmPmMatch[1];
      const endAmPm = endAmPmMatch[1];

      if (startAmPm === endAmPm) {
        // Both times are AM or both are PM, use compact format
        // Extract just the hour and minute parts
        const startHour = formattedStart.replace(new RegExp(`${startAmPm}.*`), '');
        const endHour = formattedEnd.replace(new RegExp(`${endAmPm}.*`), '');

        // Use shared am/pm suffix with timezone
        displayTime = `${startHour}-${endHour}${startAmPm} ${tzAbbr}`;
      } else {
        // Different periods (one am, one pm), use standard format
        // Remove the timezone from the first time since it will be shown at the end
        const startTime = formattedStart.replace(` ${tzAbbr}`, '');
        const endTime = formattedEnd;
        displayTime = `${startTime} - ${endTime}`;
      }
    }

    // Calculate if this is a middle slot (neither first nor last)
    const isMiddleSlot = !isFirstSlot && !isLastSlot;

    // Debug log for development - uncomment to validate event durations
    // console.log(`Event: ${isFirstSlot ? 'FIRST' : ''} ${isLastSlot ? 'LAST' : ''} DurationMs: ${durationMs} ms, Duration: ${durationMs/(60*1000)} min, isShort: ${isShortEvent}`);

    // Determine vertical line properties
    const verticalLinePosition = {
      top: isFirstSlot ? 16 : 0, // Start below "AVAILABLE" label for first slot, from top for others
      height: isLastSlot ? '100%' : 'calc(100% + 2px)' // Extend to bottom of cell for last slot, beyond for others
    };

    return {
      ...matchingEvent,
      isFirstSlot,
      isLastSlot,
      isMiddleSlot,
      durationSlots,
      displayTime,
      fillPercentage,
      verticalLinePosition,
      isShortEvent,
      eventId: matchingEvent.id || `${matchingEvent.start}-${matchingEvent.end}` // Use ID or create one from start/end time
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
  // Track the last day with availability plus one
  const [lastAvailabilityDatePlusOne, setLastAvailabilityDatePlusOne] = useState(null);

  // Find first and last availability when events change
  useEffect(() => {
    const firstDay = findFirstDayWithAvailability();
    setFirstAvailabilityDate(firstDay);

    const lastDayPlusOne = findLastDayWithAvailability();
    setLastAvailabilityDatePlusOne(lastDayPlusOne);
  }, [events, findFirstDayWithAvailability, findLastDayWithAvailability]);

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

  // Update current time indicator every minute
  useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(new Date());
    };

    // Update immediately once
    updateCurrentTime();

    // Then update every minute
    const intervalId = setInterval(updateCurrentTime, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Format current time for display in the today column
  const formatCurrentTimeForDisplay = () => {
    const now = new Date();
    // Get the timezone abbreviation using our mapping function
    const tzAbbr = timezone ? getTimezoneAbbreviation(timezone) : '';

    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone || undefined
    }).toLowerCase().replace(' ', '');

    return `${timeStr} ${tzAbbr}`;
  };

  // Calculate the position for the current time indicator
  const calculateCurrentTimePosition = () => {
    // Get hours and minutes from current time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Calculate total minutes since the start of the day
    const dayStartMinutes = dayStartHour * 60;
    const currentTimeMinutes = (currentHour * 60) + currentMinute;

    // Calculate position as percentage of the day's displayed time
    const dayTotalMinutes = (dayEndHour - dayStartHour) * 60;
    const position = ((currentTimeMinutes - dayStartMinutes) / dayTotalMinutes) * 100;

    // Return a value between 0 and 100, or null if outside the displayed hours
    if (position < 0 || position > 100) {
      return null;
    }

    return position;
  };

  // Calculate position for today column time indicator
  const getTodayTimePosition = (hour, minute) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // If not in this hour block, return null
    if (currentHour !== hour) return null;

    // Calculate fraction within this time slot
    const slotStart = minute;
    const slotEnd = minute + slotDuration;

    // If current minute is not in this time slot, return null
    if (currentMinute < slotStart || currentMinute >= slotEnd) return null;

    // Calculate percentage through this slot
    const percentThroughSlot = ((currentMinute - slotStart) / slotDuration) * 100;
    return percentThroughSlot;
  };

  // Calculate current time position
  const currentTimePosition = calculateCurrentTimePosition();

  // Map of IANA timezone IDs to standard abbreviations
  const getTimezoneAbbreviation = (timezoneId) => {
    // Common timezone abbreviations mapping
    const timezoneMap = {
      // North America
      'America/New_York': 'EST',
      'America/Chicago': 'CST',
      'America/Denver': 'MST',
      'America/Los_Angeles': 'PST',
      'America/Phoenix': 'MST',
      'America/Anchorage': 'AKST',
      'America/Adak': 'HST',
      'America/Honolulu': 'HST',

      // South America
      'America/Argentina/Buenos_Aires': 'ART',
      'America/Sao_Paulo': 'BRT',
      'America/Santiago': 'CLT',
      'America/Bogota': 'COT',
      'America/Caracas': 'VET',

      // Europe
      'Europe/London': 'GMT',
      'Europe/Dublin': 'IST',
      'Europe/Paris': 'CET',
      'Europe/Berlin': 'CET',
      'Europe/Rome': 'CET',
      'Europe/Madrid': 'CET',
      'Europe/Amsterdam': 'CET',
      'Europe/Zurich': 'CET',
      'Europe/Brussels': 'CET',
      'Europe/Vienna': 'CET',
      'Europe/Stockholm': 'CET',
      'Europe/Copenhagen': 'CET',
      'Europe/Oslo': 'CET',
      'Europe/Athens': 'EET',
      'Europe/Helsinki': 'EET',
      'Europe/Bucharest': 'EET',
      'Europe/Istanbul': 'TRT',
      'Europe/Moscow': 'MSK',

      // Asia
      'Asia/Tokyo': 'JST',
      'Asia/Seoul': 'KST',
      'Asia/Shanghai': 'CST',
      'Asia/Hong_Kong': 'HKT',
      'Asia/Singapore': 'SGT',
      'Asia/Kolkata': 'IST',
      'Asia/Bangkok': 'ICT',
      'Asia/Manila': 'PHT',
      'Asia/Jakarta': 'WIB',
      'Asia/Dubai': 'GST',
      'Asia/Riyadh': 'AST',
      'Asia/Tehran': 'IRST',
      'Asia/Jerusalem': 'IST',

      // Australia/Pacific
      'Australia/Sydney': 'AEST',
      'Australia/Melbourne': 'AEST',
      'Australia/Brisbane': 'AEST',
      'Australia/Adelaide': 'ACST',
      'Australia/Darwin': 'ACST',
      'Australia/Perth': 'AWST',
      'Pacific/Auckland': 'NZST',
      'Pacific/Fiji': 'FJT',

      // Africa
      'Africa/Johannesburg': 'SAST',
      'Africa/Cairo': 'EET',
      'Africa/Lagos': 'WAT',
      'Africa/Nairobi': 'EAT',
      'Africa/Casablanca': 'WET'
    };

    // Return the mapped abbreviation if it exists
    if (timezoneMap[timezoneId]) {
      return timezoneMap[timezoneId];
    }

    try {
      // Fallback 1: Try to get the abbreviation from DateTimeFormat
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezoneId,
        timeZoneName: 'short'
      });

      const tzAbbr = formatter.formatToParts(now)
        .find(part => part.type === 'timeZoneName')?.value || '';

      // If it's not in GMT format, return it
      if (!tzAbbr.startsWith('GMT')) {
        return tzAbbr;
      }

      // Fallback 2: Return the city name from the IANA timezone
      return timezoneId.split('/').pop().replace(/_/g, ' ');
    } catch (error) {
      console.error('Error formatting timezone display:', error);
      return timezoneId;
    }
  };

  // Format timezone for display
  const getTimezoneDisplay = () => {
    if (!timezone) return "Local Timezone";
    return getTimezoneAbbreviation(timezone);
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
                <th className="time-column-header"></th>
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(({ hour, minute }) => (
                <tr key={`time-${hour}-${minute}`} className="time-slot-row">
                  <td className="time-cell">
                    <div className="time-text">
                      {minute === 0 && formatTime(hour, minute)}
                    </div>
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

                    // Check if this date is after the last availability cutoff
                    const isAfterLastAvailability = lastAvailabilityDatePlusOne &&
                      new Date(date) > new Date(lastAvailabilityDatePlusOne);

                    // Only render if not after the cutoff
                    if (isAfterLastAvailability) {
                      return null;
                    }

                    return (
                      <th
                        key={date.toISOString()}
                        className={`day-column ${today ? 'today' : ''}`}
                        ref={isFirstAvailability ? firstAvailabilityRef : today ? todayColumnRef : null}
                      >
                        <div className={today ? 'today-pill' : ''}>{formatDate(date)}</div>
                      </th>
                    );
                  }).filter(Boolean) // Filter out null values
                )}

                {/* Message column header after the last day with availability */}
                {lastAvailabilityDatePlusOne && (
                  <th className="day-column no-availability-message-column">
                    <div className="no-availability-header"></div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(({ hour, minute }) => (
                <tr key={`${hour}-${minute}`} className="time-slot-row">
                  {weeks.flatMap(week =>
                    week.dates.map(date => {
                      // Check if this date is after the last availability cutoff
                      const isAfterLastAvailability = lastAvailabilityDatePlusOne &&
                        new Date(date) > new Date(lastAvailabilityDatePlusOne);

                      // Skip dates after the cutoff
                      if (isAfterLastAvailability) {
                        return null;
                      }

                      const eventDetails = getEventForTimeSlot(date, hour, minute);
                      const isAvailable = !!eventDetails;

                      // Determine if this is a partially filled cell
                      const isPartialCell = isAvailable && eventDetails.fillPercentage < 100;

                      return (
                        <td
                          key={`${date.toISOString()}-${hour}-${minute}`}
                          className={`slot-cell ${isAvailable ? 'available' : ''} ${isPartialCell ? 'partial-cell' : ''} ${isAvailable && highlightedEventId === eventDetails.eventId ? 'highlight-contiguous' : ''}`}
                          title={isAvailable ? `${eventDetails.summary}: ${eventDetails.displayTime}` : ''}
                          onMouseEnter={isAvailable ? () => setHighlightedEventId(eventDetails.eventId) : undefined}
                          onMouseLeave={isAvailable ? () => setHighlightedEventId(null) : undefined}
                        >
                          {/* Show current time indicator only in today's column */}
                          {isToday(date) && (() => {
                            const position = getTodayTimePosition(hour, minute);
                            return position !== null ? (
                              <div
                                className="today-time-indicator"
                                style={{ top: `${position}%` }}
                              >
                                <div className="today-time-text">NOW</div>
                              </div>
                            ) : null;
                          })()}

                          {isAvailable && (
                            <div
                              className={`event-indicator ${eventDetails.fillPercentage < 100 ? 'partial' : ''} ${eventDetails.isFirstSlot && eventDetails.isShortEvent ? 'short-event' : ''} ${highlightedEventId === eventDetails.eventId ? 'highlight-contiguous' : ''}`}
                              style={{
                                height: `${eventDetails.fillPercentage}%`
                              }}
                              title={`${eventDetails.displayTime}`}
                              onMouseEnter={() => setHighlightedEventId(eventDetails.eventId)}
                              onMouseLeave={() => setHighlightedEventId(null)}
                            >
                              {eventDetails.isFirstSlot && (
                                <>
                                  <div className="event-availability-label">AVAILABLE</div>
                                  <div className="event-time">
                                    {eventDetails.displayTime}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    }).filter(Boolean) // Filter out null values
                  )}

                  {/* Empty cell for the message column */}
                  {lastAvailabilityDatePlusOne && (
                    <>
                      {/* Only create a special cell for the first row, otherwise leave it empty */}
                      {/* This is effectively a rowspan without having to modify the entire table structure */}
                      {hour === dayStartHour && minute === 0 ? (
                        <td className="no-availability-message-cell-container" rowSpan={timeSlots.length}>
                          <div className="no-availability-message">
                            There is currently no additional availability on Devon's calendar.
                            <br/>
                            <br/>
                            Reach out to <a href="mailto:devon@esmeralda.org">devon@esmeralda.org</a> to add more time slots.
                          </div>
                        </td>
                      ) : (
                        <td className="no-availability-message-cell empty-cell"></td>
                      )}
                    </>
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