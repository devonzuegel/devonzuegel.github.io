function showStartupError() {
  const loading = document.querySelector(".initial-loading");
  if (!loading) return;
  loading.classList.add("loading-failed");
  document.querySelector("#startup-status").textContent =
    "Concert Tracker couldn’t start. Please retry.";
  document.querySelector("#startup-retry").hidden = false;
}
const timeout = setTimeout(showStartupError, 20000);
try {
  await import("../app.js?v=20261002-details");
} catch (error) {
  console.error("Concert Tracker startup failed:", error);
  showStartupError();
} finally {
  clearTimeout(timeout);
}
