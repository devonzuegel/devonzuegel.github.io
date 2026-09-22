// Set apiBase to the deployed API URL when publishing the static GitHub Pages app.
// Public configuration only. Secret API keys and profile data do not belong here.
window.CONCERTS_CONFIG = {
  apiBase: /^(localhost|127\.0\.0\.1|192\.168\.)/.test(location.hostname)
    ? "/api/concerts"
    : "https://concerts-api-six.vercel.app/api/concerts",
  // The daily workflow updates this public file independently of website builds.
  catalogURL: /^(localhost|127\.0\.0\.1|192\.168\.)/.test(location.hostname)
    ? "./data/events.json"
    : "https://raw.githubusercontent.com/devonzuegel/devonzuegel.github.io/master/concerts/data/events.json",
  // Public browser token; intended for Mapbox client requests.
  mapboxToken:
    "pk.eyJ1IjoiZGV2b256dWVnZWwiLCJhIjoickpydlBfZyJ9.wEHJoAgO0E_tg4RhlMSDvA",
  mapStyleLight: "mapbox/light-v11",
  mapStyleDark: "mapbox/dark-v11",
};
