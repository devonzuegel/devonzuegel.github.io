# Setting Up Google Calendar API (No Deployment Required!)

## Why This Solution?

The Google Calendar API approach:
- ✅ **No CORS issues** - Works directly in the browser
- ✅ **No deployment needed** - Just an API key
- ✅ **Official Google method** - Reliable and supported
- ✅ **Free tier** - 1,000,000 requests/day

## Setup Steps

### 1. Get a Google Calendar API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing one)
3. Go to **APIs & Services** > **Library**
4. Search for "Google Calendar API" and click **Enable**
5. Go to **APIs & Services** > **Credentials**
6. Click **Create Credentials** > **API Key**
7. Copy your API key

### 2. Configure API Key Restrictions (Important!)

1. Click on your new API key to edit it
2. Under **Application restrictions**:
   - Select **HTTP referrers (web sites)**
   - Add your domains:
     - `http://localhost:*` (for local development)
     - `https://yourdomain.com/*` (for production)
3. Under **API restrictions**:
   - Select **Restrict key**
   - Check only **Google Calendar API**
4. Click **Save**

### 3. Make Your Calendar Public

1. Open [Google Calendar](https://calendar.google.com)
2. Find your "Devon's Availability" calendar
3. Click the three dots next to it > **Settings and sharing**
4. Scroll to **Access permissions for events**
5. Check **"Make available to public"**
   - **Important**: Uncheck "See only free/busy (hide details)" if checked
6. Save

### 4. Add API Key to Your Code

```bash
cd calendly-clone/dev/src
# Edit config.js and replace YOUR_API_KEY_HERE with your actual API key
```

### 5. Test It

```bash
npm run dev
# or
npm start
```

Your calendar should now load without any CORS errors!

## Notes

- The API key is public (it's okay to expose it in your JavaScript)
- Restrictions protect it from unauthorized use
- API key is gitignored - don't commit it
- Use `config.example.js` as a template for new setups

## Troubleshooting

### "Daily Limit Exceeded"
- Check your API key restrictions
- Verify the calendar is set to public

### "API key not valid"
- Make sure you enabled Google Calendar API
- Check that your domain is in the HTTP referrers list

### "Not Found" errors
- Verify the calendar is set to "Make available to public"
- Make sure you unchecked "See only free/busy"
