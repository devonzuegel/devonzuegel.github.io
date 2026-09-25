// Public origins only. Credentials and the recipient live in the Worker.
export const apiBase =
  location.hostname === "localhost" && location.port === "8000"
    ? "http://localhost:8787"
    : "https://qr.devonzuegel.com";
