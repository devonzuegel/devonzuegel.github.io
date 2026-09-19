// Set apiBase to the deployed API URL when publishing the static GitHub Pages app.
// Public configuration only. API keys and profile data do not belong in this file.
window.CONCERTS_CONFIG = {
  apiBase: "/api/concerts",
  // The daily workflow updates this public file independently of website builds.
  catalogURL: /^(localhost|127\.0\.0\.1|192\.168\.)/.test(location.hostname)
    ? "./data/events.json"
    : "https://raw.githubusercontent.com/devonzuegel/devonzuegel.github.io/master/concerts/data/events.json",
  mapTileURL: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  mapAttribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
};
