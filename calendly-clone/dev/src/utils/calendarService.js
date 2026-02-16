// Calendar service for handling iCal data fetching and processing

// Generate mock data for development purposes with current dates
const generateMockData = () => {
  // Get today's date
  const today = new Date();

  // Create an array to hold the mock events
  const mockEvents = [];

  // Generate events for the next 28 days (4 weeks)
  for (let i = 0; i < 28; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);

    // Skip weekends
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Morning slot (10:00 - 11:30)
    if (Math.random() > 0.4) { // 60% chance to have morning availability
      const morningStart = new Date(currentDate);
      morningStart.setHours(10, 0, 0, 0);

      const morningEnd = new Date(currentDate);
      morningEnd.setHours(11, 30, 0, 0);

      mockEvents.push({
        id: `morning-${i}`,
        summary: 'DEVON AVAILABLE',
        description: 'THIS IS MOCK DATA - MORNING AVAILABILITY',
        location: '',
        start: morningStart.toISOString(),
        end: morningEnd.toISOString(),
        status: 'confirmed',
      });
    }

    // Afternoon slot (14:00 - 16:00)
    if (Math.random() > 0.3) { // 70% chance to have afternoon availability
      const afternoonStart = new Date(currentDate);
      afternoonStart.setHours(14, 0, 0, 0);

      const afternoonEnd = new Date(currentDate);
      afternoonEnd.setHours(16, 0, 0, 0);

      mockEvents.push({
        id: `afternoon-${i}`,
        summary: 'DEVON AVAILABLE',
        description: 'THIS IS MOCK DATA - AFTERNOON AVAILABILITY',
        location: '',
        start: afternoonStart.toISOString(),
        end: afternoonEnd.toISOString(),
        status: 'confirmed',
      });
    }

    // Evening slot (19:00 - 20:30)
    if (Math.random() > 0.5) { // 50% chance to have evening availability
      const eveningStart = new Date(currentDate);
      eveningStart.setHours(19, 0, 0, 0);

      const eveningEnd = new Date(currentDate);
      eveningEnd.setHours(20, 30, 0, 0);

      mockEvents.push({
        id: `evening-${i}`,
        summary: 'DEVON AVAILABLE',
        description: 'THIS IS MOCK DATA - EVENING AVAILABILITY',
        location: '',
        start: eveningStart.toISOString(),
        end: eveningEnd.toISOString(),
        status: 'confirmed',
      });
    }
  }

  // Add a few non-availability events
  mockEvents.push({
    id: '5b1g2ruq7ni4ber4f4iru0o1fo@google.com',
    summary: 'Jane McTest: Consultation  (Devon Zuegel)',
    description: 'THIS IS MOCK DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    location: 'Devon Zuegel',
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 13, 0).toISOString(),
    end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 14, 0).toISOString(),
    status: 'confirmed',
  });

  mockEvents.push({
    id: '71D667FA-18EF-48A2-9916-6A62B18E8AC2',
    summary: 'Turo rental of Fiat 500',
    description: 'THIS IS MOCK DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    location: '',
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 9, 0).toISOString(),
    end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 14, 0).toISOString(),
    status: 'confirmed',
  });

  return mockEvents;
};

export const MOCK_CALENDAR_DATA = generateMockData();

/**
 * Fetches and processes calendar data using Google Calendar API
 * @param {string} apiKey - Google Calendar API key
 * @returns {Promise<Array>} - A promise that resolves to an array of calendar events
 */
export async function loadCalendarData(apiKey) {
  try {
    // Calendar ID for Devon's Availability calendar
    const calendarId = '84493a3e42d31bd0bda75f6708cdf8d5c5162ee2981362f786cc04b56d282cd3@group.calendar.google.com';

    // Get current time and time range (next 60 days)
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 60);

    // Google Calendar API URL - no CORS issues!
    const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
      `key=${apiKey}` +
      `&timeMin=${now.toISOString()}` +
      `&timeMax=${futureDate.toISOString()}` +
      `&singleEvents=true` +
      `&orderBy=startTime` +
      `&maxResults=2500`;

    console.log('Fetching from Google Calendar API...');

    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Calendar API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Convert Google Calendar API format to our format
    const jsonEvents = data.items.map((event) => {
      return {
        id: event.id,
        summary: event.summary || 'No Title',
        description: event.description || '',
        location: event.location || '',
        // Handle both date and dateTime formats
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        status: event.status || 'confirmed',
      };
    });

    console.log(`Loaded ${jsonEvents.length} events from Google Calendar API`);

    return jsonEvents;
  } catch (error) {
    console.error('Calendar data loading error:', error);
    throw error;
  }
}

/**
 * Alternative method using XMLHttpRequest which sometimes works better with CORS
 * @param {string} icalUrl - The iCal URL to fetch
 * @returns {Promise<Array>} - A promise that resolves to an array of calendar events
 */
export function loadCalendarWithXHR(icalUrl) {
  return new Promise((resolve, reject) => {
    // Calendar ID from your URL
    const calendarId = '84493a3e42d31bd0bda75f6708cdf8d5c5162ee2981362f786cc04b56d282cd3@group.calendar.google.com';
    
    // iCal URL format if not provided
    const finalUrl = icalUrl || `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;

    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          try {
            const icalData = xhr.responseText;
            console.log('XHR Response first 100 chars:', icalData.substring(0, 100));

            if (!icalData.includes('BEGIN:VCALENDAR')) {
              reject(new Error('Response is not a valid iCal file'));
              return;
            }

            const jcalData = ICAL.parse(icalData);
            const comp = new ICAL.Component(jcalData);
            const events = comp.getAllSubcomponents('vevent');

            const jsonEvents = events.map((event) => {
              const icalEvent = new ICAL.Event(event);
              return {
                id: icalEvent.uid,
                summary: icalEvent.summary,
                description: icalEvent.description || '',
                location: icalEvent.location || '',
                start: icalEvent.startDate.toJSDate().toISOString(),
                end: icalEvent.endDate.toJSDate().toISOString(),
                status: icalEvent.status || 'confirmed',
              };
            });

            jsonEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
            resolve(jsonEvents);
          } catch (error) {
            reject(new Error(`Error processing data: ${error.message}`));
          }
        } else {
          reject(new Error(`XHR Error: ${xhr.status} ${xhr.statusText}`));
        }
      }
    };

    xhr.open('GET', finalUrl, true);
    xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
    xhr.send();
  });
}