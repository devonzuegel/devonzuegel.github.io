// Calendar service for handling iCal data fetching and processing

// Mock data for development purposes
const MOCK_DATA = [
  {
    id: '5b1g2ruq7ni4ber4f4iru0o1fo@google.com',
    summary: 'Jane McTest: Consultation  (Devon Zuegel)',
    description: 'THIS IS MOCK DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    location: 'Devon Zuegel',
    start: '2023-02-18T14:30:00.000Z',
    end: '2023-02-18T15:20:00.000Z',
    status: 'confirmed',
  },
  {
    id: '71D667FA-18EF-48A2-9916-6A62B18E8AC2',
    summary: 'Turo rental of Fiat 500',
    description: 'THIS IS MOCK DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    location: '',
    start: '2023-06-11T15:00:00.000Z',
    end: '2023-06-11T20:25:00.000Z',
    status: 'confirmed',
  },
  {
    id: 'C22210CA-D3D4-48F4-A00B-59C4CB16D92E',
    summary: 'AVAILABLE FOR MEETINGS',
    description: 'THIS IS MOCK DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    location: '',
    start: '2024-05-12T08:30:00.000Z',
    end: '2024-05-12T09:00:00.000Z',
    status: 'confirmed',
  },
  {
    id: '4E76A6DE-7C8F-4F9C-84DA-1418A2AAFF1E',
    summary: 'AVAILABLE FOR MEETINGS',
    description: 'THIS IS MOCK DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    location: '',
    start: '2024-08-19T17:00:00.000Z',
    end: '2024-08-19T19:15:00.000Z',
    status: 'confirmed',
  },
  {
    id: '32E4B11E-E7EB-420B-9D45-6DA6D26CAD8D',
    summary: 'DEVON AVAILABLE',
    description: 'THIS IS MOCK DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    location: '',
    start: '2025-04-17T16:00:00.000Z',
    end: '2025-04-17T18:00:00.000Z',
    status: 'confirmed',
  },
  {
    id: '6169106C-7AFC-4183-97FA-8B36C546E62E',
    summary: 'DEVON AVAILABLE',
    description: 'THIS IS MOCK DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    location: '',
    start: '2025-05-12T15:00:00.000Z',
    end: '2025-05-12T16:00:00.000Z',
    status: 'confirmed',
  },
  {
    id: '4FC7D0FC-ACE6-4448-A1CF-AE05C0A3324D',
    summary: 'DEVON AVAILABLE',
    description: 'THIS IS MOCK DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    location: '',
    start: '2025-05-12T20:00:00.000Z',
    end: '2025-05-12T21:00:00.000Z',
    status: 'confirmed',
  },
  {
    id: '6C1D2869-7144-479F-B24B-03E8B032F4C6',
    summary: 'DEVON AVAILABLE',
    description: 'THIS IS MOCK DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    location: '',
    start: '2025-05-13T15:00:00.000Z',
    end: '2025-05-13T17:00:00.000Z',
    status: 'confirmed',
  },
  {
    id: '207FB273-9A66-4135-918E-F9CDF8DA2783',
    summary: 'DEVON AVAILABLE',
    description: 'THIS IS MOCK DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    location: '',
    start: '2025-05-13T20:00:00.000Z',
    end: '2025-05-13T23:00:00.000Z',
    status: 'confirmed',
  },
  {
    id: 'F9CA4ABA-BA19-4BCB-A9C7-DC0B89656D02',
    summary: 'DEVON AVAILABLE',
    description: 'THIS IS MOCK DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    location: '',
    start: '2025-05-14T15:00:00.000Z',
    end: '2025-05-14T17:00:00.000Z',
    status: 'confirmed',
  },
  {
    id: 'D3C69E3B-58AC-4870-B8B1-1B290E1C7465',
    summary: 'DEVON AVAILABLE',
    description: 'THIS IS MOCK DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    location: '',
    start: '2025-05-15T15:00:00.000Z',
    end: '2025-05-15T18:00:00.000Z',
    status: 'confirmed',
  },
  {
    id: 'D0969E0F-4F70-42B8-9C26-E4E74DD86024',
    summary: 'DEVON AVAILABLE',
    description: 'THIS IS MOCK DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    location: '',
    start: '2025-05-15T20:00:00.000Z',
    end: '2025-05-15T21:00:00.000Z',
    status: 'confirmed',
  },
];

/**
 * Fetches and processes calendar data
 * @param {string} proxyUrl - The CORS proxy URL to use for fetching
 * @returns {Promise<Array>} - A promise that resolves to an array of calendar events
 */
export async function loadCalendarData(proxyUrl) {
  try {
    // Calendar ID from the original URL
    const calendarId = '84493a3e42d31bd0bda75f6708cdf8d5c5162ee2981362f786cc04b56d282cd3@group.calendar.google.com';

    // Two different URL formats to try
    const icalUrl1 = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
    const icalUrl2 = `https://calendar.google.com/calendar/renders/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;

    // Debug information
    console.log('Trying URL:', icalUrl1);
    console.log('With proxy:', proxyUrl);

    // Fetch with selected proxy
    let response;

    if (proxyUrl === 'direct') {
      response = await fetch(icalUrl1);
    } else {
      response = await fetch(proxyUrl + encodeURIComponent(icalUrl1));
    }

    // If first URL fails, try the second format
    if (!response.ok) {
      console.log('First URL failed, trying alternative URL:', icalUrl2);

      if (proxyUrl === 'direct') {
        response = await fetch(icalUrl2);
      } else {
        response = await fetch(proxyUrl + encodeURIComponent(icalUrl2));
      }
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`);
    }

    const icalData = await response.text();

    // Debug: Check if we got valid iCal data
    console.log('Response first 100 chars:', icalData.substring(0, 100));

    // Check if the response is actually an iCal file
    if (!icalData.includes('BEGIN:VCALENDAR')) {
      throw new Error('Response is not a valid iCal file');
    }

    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    const events = comp.getAllSubcomponents('vevent');

    // For now, using mock data as in the original code
    // In a production environment, uncomment the code below to use real data
    const jsonEvents = MOCK_DATA;
    /* const jsonEvents = events.map((event) => {
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
    }); */

    // Sort events by start date
    jsonEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

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