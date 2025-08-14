# Devon's Availability Calendar

A React-based clone of the original Calendly-like availability display page.

## How to make changes

1. Run `npm install` to install dependencies.
2. Run `npm start` the `calendly-clone/dev` directory to start the development server and view the app in your browser.
3. Make your changes in the `calendly-clone/dev` directory.
4. Once you're done, run `npm run build` to create a production build in the `calendly-clone/dist` directory.
5. Merge your changes to the `master` branch and push to GitHub, which will trigger the CI/CD pipeline to deploy the changes to the live site.

## Features & changes I plan to make in the future
- collapse the cells at the top and bottom of the calendar that are empty, but make them un-collapsible too
- make the loading view a nice spinner or something
- dark mode
- format dates as 11-11:30am and 11am-1pm, etc
- scroll the available times into view and hide the times that don't have availability, though still show them, just under scroll
- put back the < > buttons to scroll through the days
- add a list view in addition to the Month/Week view
- make the timezone map look more realistic
- overlay the timezone regions over a real map of the world to make it a little less ugly

Things I think I did, but want to double check:
- highlight "today" in the calendar, according to the user's selected timezone

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