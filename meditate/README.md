# Tranquila

Meditation audio search app backed by the Internet Archive.

## Testing on iPhone

### Over local WiFi (no deploy needed)

Both your Mac and iPhone must be on the same WiFi network.

1. Start a local server from the **repo root**:
   ```
   cd /Users/devonzuegel/dev/devonzuegel.github.io
   python3 -m http.server 8000 --bind 0.0.0.0
   ```

2. Find your Mac's local IP:
   ```
   ipconfig getifaddr en0
   ```

3. On your iPhone, open Safari and go to:
   ```
   http://<your-ip>:8000/meditate/
   ```
   (trailing slash matters)

> **Note:** The service worker won't register over plain `http://`, but all UI behavior — including the keyboard/scroll bug — is testable this way.

### Force-refreshing the deployed version on iPhone

If you've deployed to GitHub Pages and want to make sure your iPhone has the latest:

1. Go to the **About** tab in the app
2. Tap **Refresh now** — it clears the service worker cache and reloads with a cache-busting URL

### Remote debugging (see iPhone Safari console on Mac)

1. On iPhone: Settings → Safari → Advanced → Web Inspector → On
2. Plug iPhone into Mac via USB and trust the connection
3. On Mac: Safari → Develop → [your iPhone's name] → pick the tab

This lets you inspect elements, see console logs, and debug layout issues in real time on the actual device.
