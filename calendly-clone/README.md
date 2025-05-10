# Devon's Availability Calendar

A React-based clone of the original Calendly-like availability display page.

## How to make changes

1. Run `npm install` to install dependencies.
2. Run `npm start` to start the development server and view the app in your browser.
3. Make your changes in the `calendly-clone/dev` directory.
4. Once you're done, run `npm run build` to create a production build in the `calendly-clone/dist` directory.
5. Merge your changes to the `master` branch and push to GitHub, which will trigger the CI/CD pipeline to deploy the changes to the live site.

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