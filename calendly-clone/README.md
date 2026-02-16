# Devon's Availability Calendar

A React-based clone of the original Calendly-like availability display page.

## How to make changes

1. Run `npm install` to install dependencies.
2. Run `npm start` the `calendly-clone/dev` directory to start the development server and view the app in your browser.
3. Make your changes in the `calendly-clone/dev` directory.
4. Once you're done, run `npm run build` to create a production build in the `calendly-clone/dist` directory.
5. Merge your changes to the `master` branch and push to GitHub, which will trigger the CI/CD pipeline to deploy the changes to the live site.

## Features & changes I plan to make in the future
- PARTIALLY DONE: make dark mode prettier
- PARTIALLY DONE: make the theme toggle prettier
  - use nicer icons
  - animate between the selection
  - use a different icon to show the system theme
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
   cd calendly-clone/dev
   npm install
   ```

2. Set up Google Calendar API:
   - Follow the instructions in [SETUP_CALENDAR_API.md](./SETUP_CALENDAR_API.md)
   - Copy `src/config.example.js` to `src/config.js`
   - Add your Google Calendar API key to `config.js`

3. Start the development server:
   ```
   npm start
   ```

4. Build for production:
   ```
   npm run build
   ```

## Implementation Details

This application fetches calendar data directly from Google Calendar using the **Google Calendar API v3**. It displays available time slots from a public calendar.

### Why Google Calendar API Instead of iCal?

Previously, this app used iCal URLs with CORS proxies, but public CORS proxy services are unreliable (they go down frequently). The Google Calendar API provides:

- ✅ **No CORS issues** - Works directly from the browser
- ✅ **No dependencies on third-party proxies** - Direct Google API access
- ✅ **Better reliability** - Official Google-supported endpoint
- ✅ **No deployment required** - Just needs an API key

## Security: Is the API Key Safe in Client-Side JavaScript?

**Yes, when properly configured.** Here's why:

### What Protects Your API Key:

1. **HTTP Referrer Restrictions** - The API key only works from domains you explicitly allow (e.g., `localhost:*`, `yourdomain.com/*`)
2. **API Restrictions** - The key is limited to only the Google Calendar API (can't access Gmail, Drive, etc.)
3. **Public Calendar Access Only** - The key can ONLY read calendars that are already set to public

### What Your API Key CAN'T Do:

- ❌ Access your private calendars
- ❌ Access other people's calendars (unless they're public)
- ❌ Modify, create, or delete events (read-only)
- ❌ Be used from unauthorized domains/referrers
- ❌ Access any other Google APIs

### What Your API Key CAN Do:

- ✅ Read events from the specific public calendar (your availability calendar)
- ✅ Only from your allowed domains (configured in Google Cloud Console)
- ✅ Only via the Google Calendar API

### Best Practices:

1. **Only make the calendar you want public actually public** - Don't share more than you intend
2. **Set up HTTP referrer restrictions** - Lock the API key to your specific domains
3. **Use API restrictions** - Limit to only Google Calendar API
4. **This calendar should only contain availability blocks** - Not sensitive personal information

### When You Would Need More Security:

If you needed to access **private calendars**, you would need:
- OAuth 2.0 authentication (requires user login)
- A backend server to keep credentials secure

But for a **public availability calendar**, the API key approach is secure and standard practice.

For more details, see [SETUP_CALENDAR_API.md](./SETUP_CALENDAR_API.md).

## Tech Stack

- React.js
- Google Calendar API v3
- Vite for build tooling