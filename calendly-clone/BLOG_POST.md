# Build Your Own Calendly: A Free, Open-Source Alternative That Lives on Your Calendar

**TL;DR**: I built a Calendly clone that reads directly from Google Calendar and deploys as a static site. No monthly fees, no separate system to maintain, and you manage your availability where you already live—your calendar.

---

## Why Build This?

I love Calendly's concept, but I found myself constantly context-switching between my actual calendar and Calendly's availability settings. When someone asked to meet, I'd:

1. Check my Google Calendar to see when I'm free
2. Open Calendly
3. Update my availability settings there
4. Send them the link
5. Hope I didn't miss something and create a conflict

What if my calendar could just *be* my scheduling page? That's what this is.

## The Key Insight

Instead of maintaining availability in a separate system, I created a special **"Availability"** calendar in Google Calendar. When I have open slots for meetings, I add "AVAILABLE" blocks. My scheduling page reads these blocks and displays them to anyone who wants to book time with me.

### Why This Is Better Than Calendly

**Pros:**
- ✅ **One source of truth** - Your calendar *is* your availability
- ✅ **No context switching** - Add/remove availability blocks in the same place you manage everything else
- ✅ **Free & open source** - No monthly subscription fees
- ✅ **Full control** - Host it yourself, customize the UI, no vendor lock-in
- ✅ **Static site** - Deploy to GitHub Pages, Netlify, Vercel—anywhere
- ✅ **Privacy** - Your calendar data isn't going through a third party (beyond Google, which you're already using)

**Cons:**
- ❌ **Manual availability updates** - When someone books a slot, you need to manually remove that availability block (Calendly does this automatically)
- ❌ **No booking confirmation flow** - This is just a display page; people still email/message you to book (though you could extend it to add booking functionality)

### The "Manual Update" Limitation in Practice

If you're thinking "manually updating availability sounds annoying," I thought so too. But in practice, it's a non-issue for me because:

1. **I'm in my calendar constantly** - I'm already checking it dozens of times a day
2. **The moment someone books a slot**, I immediately see it and can delete the availability block (takes 5 seconds)
3. **I batch-create availability blocks** - Once a week, I look ahead and add availability blocks for times I want to be bookable

If you're like me and live in your calendar, this "limitation" is actually just... normal calendar maintenance.

---

## How to Build Your Own

This guide assumes you're comfortable with basic terminal commands and have a Google account. Total time: ~30 minutes.

### Step 1: Set Up Your Google Calendar

#### 1.1 Create a New Calendar for Availability

1. Open [Google Calendar](https://calendar.google.com)
2. On the left sidebar, click the **+** next to "Other calendars"
3. Select **"Create new calendar"**
4. Name it something like **"Availability"** or **"Bookable Time"**
5. Click **"Create calendar"**

#### 1.2 Make the Calendar Public

1. Find your new calendar in the left sidebar
2. Click the three dots next to it → **"Settings and sharing"**
3. Scroll to **"Access permissions for events"**
4. Check **"Make available to public"**
5. **IMPORTANT**: Make sure it shows **"See all event details"** (not just "See only free/busy")
6. Click back to your calendar

#### 1.3 Get Your Calendar ID

1. Still in calendar settings, scroll down to **"Integrate calendar"**
2. Copy the **Calendar ID** - it looks like: `abc123...@group.calendar.google.com`
3. Save this somewhere - you'll need it later

#### 1.4 Add Some Availability Blocks

1. Go back to your calendar view
2. Create events in your Availability calendar with the summary: **"AVAILABLE"** or **"DEVON AVAILABLE"** (case-sensitive)
3. Set them to times when you want to be bookable
4. Example: Create blocks for Tuesday 2-4pm, Wednesday 10am-12pm, etc.

**Pro tip**: I create recurring availability blocks (e.g., "Every Tuesday 2-4pm") and then delete specific instances when they get booked or I'm busy.

---

### Step 2: Set Up Google Calendar API

#### 2.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** at the top → **"New Project"**
3. Name it something like "Calendar App" and click **"Create"**
4. Wait for the project to be created (takes ~10 seconds)

#### 2.2 Enable the Google Calendar API

1. In the search bar at the top, type **"Google Calendar API"**
2. Click on **"Google Calendar API"** in the results
3. Click the blue **"Enable"** button
4. Wait for it to enable (~5 seconds)

#### 2.3 Create an API Key

1. In the left sidebar, go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** at the top → **"API key"**
3. Copy the API key that appears (starts with `AIza...`)
4. Click **"Edit API key"** (or the pencil icon next to it)

#### 2.4 Restrict the API Key (Important for Security!)

Still in the API key settings:

1. **Application restrictions:**
   - Select **"HTTP referrers (web sites)"**
   - Click **"Add an item"**
   - Add these referrers:
     - `http://localhost:*` (for local development)
     - `https://yourdomain.com/*` (replace with your actual domain)
     - `https://*.github.io/*` (if using GitHub Pages)

2. **API restrictions:**
   - Select **"Restrict key"**
   - In the dropdown, check **only** "Google Calendar API"

3. Click **"Save"**

**Why these restrictions?** They ensure your API key can only be used from your website and can only access the Calendar API (not Gmail, Drive, etc.). This makes it safe to expose the key in client-side JavaScript.

---

### Step 3: Set Up the Code

#### 3.1 Clone or Download the Repository

```bash
git clone https://github.com/devonzuegel/devonzuegel.github.io.git
cd devonzuegel.github.io/calendly-clone/dev
```

Or download the files from the `calendly-clone` directory in my repo: [github.com/devonzuegel/devonzuegel.github.io](https://github.com/devonzuegel/devonzuegel.github.io/tree/master/calendly-clone)

#### 3.2 Install Dependencies

```bash
npm install
```

#### 3.3 Configure Your API Key and Calendar ID

1. Copy the example config file:
   ```bash
   cp src/config.example.js src/config.js
   ```

2. Edit `src/config.js`:
   ```javascript
   export const GOOGLE_CALENDAR_API_KEY = 'AIzaSy...'; // Your API key from Step 2.3
   export const CALENDAR_ID = 'abc123...@group.calendar.google.com'; // Your calendar ID from Step 1.3
   ```

#### 3.4 Test Locally

```bash
npm start
```

Open http://localhost:3000 in your browser. You should see your availability blocks displayed in a weekly calendar view!

**Troubleshooting:**
- **"403 Forbidden" error**: Your API key restrictions might not include `http://localhost:*`. Add it in Google Cloud Console.
- **No events showing**: Make sure your events have "AVAILABLE" in the summary and your calendar is set to public.
- **Calendar not found**: Double-check the calendar ID in `config.js`.

---

### Step 4: Build and Deploy

#### 4.1 Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

#### 4.2 Deploy as a Static Site

You have many options for hosting static sites. Here are the most popular:

**Option A: GitHub Pages (Free)**

1. Create a new GitHub repository or use an existing one
2. Copy the contents of `dist/` to your repository
3. In your repo settings, enable GitHub Pages and point it to your branch
4. Your site will be live at `https://yourusername.github.io/`

**Option B: Netlify (Free)**

1. Sign up at [netlify.com](https://www.netlify.com)
2. Click **"Add new site"** → **"Deploy manually"**
3. Drag and drop the `dist/` folder
4. Your site is live! Netlify gives you a URL like `https://random-name.netlify.app`

**Option C: Vercel (Free)**

1. Sign up at [vercel.com](https://vercel.com)
2. Install Vercel CLI: `npm i -g vercel`
3. In the `calendly-clone/dev` directory, run: `vercel`
4. Follow the prompts to deploy

#### 4.3 Update API Key Restrictions

**Critical step!** Now that you have a production URL, add it to your API key's HTTP referrers:

1. Go back to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your API key
3. Under HTTP referrers, add your production domain (e.g., `https://yourdomain.com/*`)
4. Click **"Save"**
5. Wait 1-2 minutes for changes to propagate

---

### Step 5: Share Your Scheduling Link

Your scheduling page is now live! Share it with people:

```
"Book a time with me: https://yourdomain.com/calendly-clone"
```

You can:
- Add it to your email signature
- Put it in your Twitter/LinkedIn bio
- Link it from your personal website
- Include it in your newsletter

---

## Customization Ideas

The code is yours to modify! Here are some ideas:

### Change the Summary Filter

By default, it looks for events with "AVAILABLE" in the summary. To customize this, edit `src/components/CalendarView.jsx`:

```javascript
const availabilityEvents = allEvents.filter(event =>
  event.summary.includes("YOUR_KEYWORD_HERE")
);
```

### Customize the Styling

The UI is built with React and CSS. Edit the component files in `src/components/` to change:
- Colors and theme (see `CalendarView.css`, `WeeklyCalendar.css`)
- Layout and typography
- Timezone selector behavior
- Date/time formatting

### Add Multiple Calendar Support

Want to show availability from multiple calendars (e.g., work and personal)?

1. Make both calendars public and get their IDs
2. Modify `src/utils/calendarService.js` to fetch from both:
   ```javascript
   const [calendar1, calendar2] = await Promise.all([
     loadCalendarData(apiKey, CALENDAR_ID_1),
     loadCalendarData(apiKey, CALENDAR_ID_2),
   ]);
   const allEvents = [...calendar1, ...calendar2];
   ```

### Add Automatic Booking (Advanced)

To make this a true Calendly replacement, you'd need to:

1. Add a booking form that collects attendee info
2. Use the Google Calendar API to create events (requires OAuth, not just an API key)
3. Send confirmation emails

This requires backend functionality (you can't do OAuth purely client-side securely), so you'd need to add a serverless function (Netlify Functions, Vercel Edge Functions, or Cloudflare Workers).

---

## Security: Is It Safe to Expose the API Key?

**Yes, when properly configured.** Here's what protects you:

1. **HTTP Referrer Restrictions** - The key only works from your specific domains
2. **API Restrictions** - The key can only access Google Calendar API (not Gmail, Drive, etc.)
3. **Read-Only Access** - The key can only read public calendar data, not modify anything
4. **Public Calendar Only** - The key can only access calendars you've explicitly made public

**What the key CAN'T do:**
- Access your private calendars
- Modify or delete events
- Access other Google services
- Be used from unauthorized domains

**What the key CAN do:**
- Read events from your public availability calendar
- Only from domains you've whitelisted

This is why it's safe to include the API key in your client-side JavaScript. Google designed API keys specifically for this use case.

**When you'd need more security:** If you wanted to access private calendars or create events (like actual booking functionality), you'd need OAuth 2.0 with a backend server. But for a read-only public calendar, API keys are the standard approach.

---

## My Workflow

Here's how I use this day-to-day:

**Sunday evening**: I look at my week ahead and add ~10-15 availability blocks to my Availability calendar for times I'm willing to take meetings.

**Throughout the week**:
- When someone wants to meet, I send them my scheduling link
- They pick a time and email/Slack me
- I immediately create the meeting event on my calendar and delete the availability block (takes 15 seconds)
- The availability disappears from my scheduling page within ~5 minutes (Google's cache)

**Adjustments**: If something comes up and I need to cancel an availability block, I just delete it from my calendar like any other event.

It's seamless because I'm already living in Google Calendar all day.

---

## Cost Breakdown: This vs. Calendly

**This solution:**
- Google Calendar API: Free (1,000,000 requests/day on free tier—you'll never hit this)
- Hosting: Free (GitHub Pages, Netlify, Vercel all have generous free tiers)
- **Total: $0/month**

**Calendly:**
- Free tier: Very limited (one event type, one calendar connection)
- Essentials: $10/month
- Professional: $15/month
- Teams: $20/user/month
- **Total: $120-240/year for individual use**

If you're already a developer with a personal website, this is a no-brainer.

---

## Limitations and Tradeoffs

Let's be honest about what this doesn't do:

**Compared to Calendly:**
- ❌ No automatic availability removal when booked
- ❌ No built-in booking confirmation flow
- ❌ No email reminders or calendar invites (you handle this manually)
- ❌ No buffer time configuration (though you can just not add availability blocks too close together)
- ❌ No team scheduling features

**However:**
- ✅ You own the code and data
- ✅ No monthly fees
- ✅ Integrates with your existing calendar workflow
- ✅ Fully customizable
- ✅ Works offline (once built)
- ✅ No vendor lock-in

**Who this is for:**
- Developers who want control over their scheduling page
- People who already live in their calendar
- Anyone wanting to avoid subscription fees
- Those who value privacy and data ownership

**Who should stick with Calendly:**
- Teams needing coordination features
- People who need automatic booking confirmations
- Those who want a fully managed solution with support

---

## The Code

The full source code is available on GitHub: [github.com/devonzuegel/devonzuegel.github.io/tree/master/calendly-clone](https://github.com/devonzuegel/devonzuegel.github.io/tree/master/calendly-clone)

**Tech stack:**
- React.js for the UI
- Google Calendar API v3 for data
- Vite for build tooling
- Vanilla CSS for styling (no framework)

It's intentionally simple and dependency-light. The core logic is in three files:
- `calendarService.js` - Fetches and processes calendar data
- `CalendarView.jsx` - Main component
- `WeeklyCalendar.jsx` - Calendar UI

---

## Conclusion

After using this for a few months, I can't imagine going back. The ability to manage my availability in the same place I manage everything else is huge. And knowing I can customize it however I want—change the UI, add features, integrate with other tools—makes it feel like a natural extension of my personal website rather than a third-party service bolted on.

If you build your own version, I'd love to see it! Feel free to fork the code, modify it, and make it your own.

---

## Appendix: Quick Reference

### Essential Links
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api/v3/reference)
- [Source Code Repository](https://github.com/devonzuegel/devonzuegel.github.io/tree/master/calendly-clone)

### Calendar Summary Keywords
The code filters for events containing "AVAILABLE" in the summary. Change this in `CalendarView.jsx`:
```javascript
const availabilityEvents = allEvents.filter(event =>
  event.summary.includes("AVAILABLE")
);
```

### Deployment Commands
```bash
# Build
npm run build

# Deploy to Netlify
npx netlify deploy --prod --dir=dist

# Deploy to Vercel
vercel --prod

# Deploy to GitHub Pages
# (copy dist/ contents to your gh-pages branch)
```

### Useful Calendar API Endpoints
```javascript
// Get events from a calendar
GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?key={apiKey}

// Parameters you might want:
// - timeMin: Filter events after this time
// - timeMax: Filter events before this time
// - maxResults: Limit number of events returned
// - singleEvents: Expand recurring events
// - orderBy: Sort events (startTime, updated)
```

---

**Questions?** Open an issue on [the GitHub repo](https://github.com/devonzuegel/devonzuegel.github.io/issues) or reach out to me at [your contact method].

Happy scheduling! 📅
