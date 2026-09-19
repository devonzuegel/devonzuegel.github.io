// Set apiBase to the deployed API URL when publishing the static GitHub Pages app.
// Public configuration only. API keys and profile data do not belong in this file.
window.CONCERTS_CONFIG = {
  apiBase: /^(localhost|127\.0\.0\.1|192\.168\.)/.test(location.hostname)
    ? "/api/concerts"
    : "https://concerts-api-six.vercel.app/api/concerts",
  // The daily workflow updates this public file independently of website builds.
  catalogURL: /^(localhost|127\.0\.0\.1|192\.168\.)/.test(location.hostname)
    ? "./data/events.json"
    : "https://raw.githubusercontent.com/devonzuegel/devonzuegel.github.io/master/concerts/data/events.json",
  mapStyleLight: "https://styles.maptoolkit.org/light.json",
  mapStyleDark: "https://styles.maptoolkit.org/dark.json",
  mapAttribution:
    '<a href="https://www.maptoolkit.com/copyright/" target="_blank" rel="noopener">© Maptoolkit</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© Openstreetmap</a>',
};
