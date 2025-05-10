# Devon's Availability Calendar

A React-based clone of the original Calendly-like availability display page.

## Features

- Shows availability calendar for scheduling calls
- Uses CORS proxies to fetch calendar data
- Responsive design with clean UI

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

3. Build for production:
   ```
   npm run build
   ```

## Implementation Details

This application fetches calendar data from a Google Calendar and displays available time slots. It supports multiple CORS proxies to handle potential cross-origin issues.

The current implementation uses mock data for demonstration purposes, but can be easily modified to use real calendar data by uncommenting the relevant sections in the `calendarService.js` file.

## Tech Stack

- React.js
- ical.js for calendar processing
- Vite for build tooling