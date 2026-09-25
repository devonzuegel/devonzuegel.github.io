import { apiBase } from "./config.js";
import { svg, download } from "./qr.js";
const $ = (s) => document.querySelector(s),
  view = $("#view");
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const date = (t) =>
  t
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(t * 1000))
    : "—";
const locationText = (g) =>
  [g.city, g.region, g.country].filter(Boolean).join(", ") ||
  "Location unavailable";
const labels = {
  pending: "Pending",
  accepted: "Sent to email service",
  suppressed: "Suppressed",
  failed: "Failed / unconfirmed",
};
const reasons = {
  alerts_off: "Alerts turned off",
  email_not_configured: "Email is not configured",
  provider_paused: "Email service quota pause",
  source_cooldown: "Source alert cooldown",
  code_cooldown: "Code alert cooldown",
  email_budget: "Application email budget",
  code_disabled: "Code disabled",
  daily_quota_exceeded: "Email service daily quota",
  monthly_quota_exceeded: "Email service monthly quota",
  provider_configuration: "Check sender and API key",
  provider_rejected: "Email service rejected the request",
  retry_window_ended: "Retry window ended; delivery may be unconfirmed",
  provider_rate_limit: "Email service rate limit",
  network_error: "Temporary network problem",
  provider_temporary_error: "Email service temporarily unavailable",
};
let flash = "",
  csrf = null,
  currentCode = null,
  settings = null,
  version = 0,
  search = "",
  nextCodes = null,
  nextVisits = null,
  creatingKey = null,
  duplicateKeys = new Map();
function message(text, error = false) {
  $("#notice").textContent = text;
  $("#notice").className = text ? `notice ${error ? "error" : "success"}` : "";
  $("#notice").setAttribute("role", error ? "alert" : "status");
}
async function api(path, options = {}) {
  if (!csrf && options.body && path !== "/auth/logout") {
    const fresh = await api("/api/session");
    csrf = fresh.csrf;
    $("#reauth").hidden = true;
    $("#nav").hidden = false;
    $("#new-code").hidden = false;
  }
  let response;
  try {
    response = await fetch(apiBase + path, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body
          ? { "Content-Type": "application/json", "X-CSRF-Token": csrf }
          : {}),
        ...options.headers,
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      "Cannot reach the QR service. Please try again. Your form values are still here.",
    );
  }
  const data = await response.json().catch(() => ({
    error: "The QR service returned an unreadable response.",
  }));
  if (response.status === 401 && csrf) {
    csrf = null;
    $("#nav").hidden = true;
    $("#new-code").hidden = true;
    $("#reauth").hidden = false;
    $("#reauth a").href = apiBase + "/auth/login";
    throw new Error(
      "Your session expired. Sign in in another tab, then retry to keep this form.",
    );
  }
  if (!response.ok)
    throw new Error(data.error || "Request failed. Please try again.");
  return data;
}
function signedOut(error = "") {
  csrf = null;
  currentCode = null;
  settings = null;
  $("#reauth").hidden = true;
  $("#nav").hidden = true;
  $("#new-code").hidden = true;
  $("#budget-notice").hidden = true;
  view.innerHTML = `<section class="panel signin"><div class="qr-mark" aria-hidden="true">▦</div><p class="eyebrow">Only for the owner</p><h2>A printed code.<br>A link you can change.</h2><p>Create a code, put it out in the world, and get a little note when its link is opened.</p><a class="button primary" href="${apiBase}/auth/login">Sign in with GitHub</a><p class="muted">This is a private dashboard.</p>${error ? `<p role="alert">${esc(error)}</p><button id="retry">Try again</button>` : ""}</section>`;
  $("#retry")?.addEventListener("click", boot);
}
async function refreshSettings() {
  settings = await api("/api/settings");
  const messages = [];
  if (!settings.email_ready)
    messages.push(
      "Email alerts are not configured yet. Codes and redirects still work.",
    );
  if (settings.pause)
    messages.push(
      `Email service paused: ${reasons[settings.pause.value] || "quota reached"}. Until ${date(settings.pause.expires_at)}.`,
    );
  if (
    settings.budget.day.used >= settings.budget.day.limit ||
    settings.budget.month.used >= settings.budget.month.limit
  )
    messages.push(
      "Email budget reached. New alerts are suppressed; link opens still record within the logging allowance.",
    );
  if (settings.logging.used >= settings.logging.limit)
    messages.push(
      "Daily logging limit reached. Links still redirect, but additional opens today are not recorded.",
    );
  const box = $("#budget-notice");
  box.textContent = messages.join(" ");
  box.hidden = !messages.length;
}
const empty = () =>
  '<section class="panel empty"><h2>Your first code starts here.</h2><p>A website, a name, and you’re ready to print.</p><a class="button primary" href="#/new">+ New QR code</a></section>';
function card(c) {
  return `<article class="code-card" data-id="${esc(c.id)}"><div><div class="card-heading"><a class="code-name" href="#/codes/${c.id}">${esc(c.name)}</a><span class="badge ${c.active ? "" : "disabled"}">${c.active ? "Active" : "Disabled"}</span></div>${c.placement ? `<p class="placement">${esc(c.placement)}</p>` : ""}<p class="destination">${esc(c.destination)}</p><p class="muted">${c.alerts ? "Alerts on" : "Alerts off"} · Last open: ${date(c.last_open)}</p></div><div class="count"><strong>${c.opens.toLocaleString()}</strong><span>QR link opens</span></div><div class="card-actions"><a href="#/codes/${c.id}">Edit &amp; download</a><button data-copy="${esc(c.tracking_url)}" class="text-button">Copy link</button><button data-duplicate="${c.id}" class="text-button">Duplicate</button></div></article>`;
}
async function loadCodes(append = false) {
  const v = version;
  const result = await api(
    `/api/codes?q=${encodeURIComponent(search)}${append && nextCodes ? `&cursor=${encodeURIComponent(nextCodes)}` : ""}`,
  );
  if (v !== version || !$("#codes")) return;
  nextCodes = result.next_cursor;
  if (append)
    $("#codes").insertAdjacentHTML(
      "beforeend",
      result.items.map(card).join(""),
    );
  else
    $("#codes").innerHTML = result.items.length
      ? result.items.map(card).join("")
      : search
        ? '<section class="panel empty"><h2>No matching codes</h2><p>Try a different name, placement or destination.</p></section>'
        : empty();
  $("#more-codes").hidden = !nextCodes;
}
function fields(
  c = { destination: "", name: "", placement: "", alerts: true },
) {
  return `<label>Destination URL<input name="destination" inputmode="url" autocomplete="url" placeholder="example.com/a-good-idea" value="${esc(c.destination)}" required maxlength="2048"><span class="hint">An omitted scheme becomes HTTPS.</span></label><label>Name<input name="name" value="${esc(c.name)}" placeholder="A name to remember it by" required maxlength="120"></label><label>Placement or note <span class="muted">(optional)</span><input name="placement" value="${esc(c.placement)}" placeholder="Library flyer, business card…" maxlength="300"></label><label class="check"><input name="alerts" type="checkbox" ${c.alerts ? "checked" : ""}> Email me when this link is opened</label>`;
}
function wireForm(c = null) {
  const form = $("#code-form");
  let edited = !!c?.name;
  form.elements.name.addEventListener("input", () => {
    edited = true;
  });
  form.elements.destination.addEventListener("input", () => {
    if (!edited) {
      try {
        const raw = form.elements.destination.value.trim();
        form.elements.name.value = new URL(
          /^https?:\/\//i.test(raw) ? raw : `https://${raw}`,
        ).hostname.replace(/^www\./, "");
      } catch {}
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    if (button.disabled) return;
    const data = {
      destination: form.elements.destination.value,
      name: form.elements.name.value,
      placement: form.elements.placement.value,
      alerts: form.elements.alerts.checked,
      active: c?.active ?? true,
    };
    button.disabled = true;
    button.textContent = "Saving…";
    $("#form-error").textContent = "";
    try {
      const code = await api(c ? `/api/codes/${c.id}` : "/api/codes", {
        method: c ? "PATCH" : "POST",
        headers: c ? {} : { "Idempotency-Key": creatingKey },
        body: JSON.stringify(data),
      });
      message(
        c
          ? "Changes saved. The printed QR code stays the same."
          : "Code created. Your image is ready to download.",
      );
      if (c) {
        currentCode = code;
        $("#detail-title").textContent = code.name;
        $(".qr-image").setAttribute("aria-label", `QR code for ${code.name}`);
        form.elements.destination.value = code.destination;
        $("#destination-preview").href = code.destination;
        $("#destination-display").textContent = code.destination;
      } else {
        creatingKey = null;
        flash = "Code created. Your image is ready to download.";
        location.hash = `/codes/${code.id}`;
      }
    } catch (err) {
      $("#form-error").textContent = err.message;
    } finally {
      button.disabled = false;
      button.textContent = c ? "Save changes" : "Create QR code";
    }
  });
}
async function visits(append = false) {
  const id = currentCode?.id,
    v = version;
  if (!id) return;
  const result = await api(
    `/api/codes/${id}/visits${append && nextVisits ? `?cursor=${encodeURIComponent(nextVisits)}` : ""}`,
  );
  if (v !== version || !$("#visits")) return;
  nextVisits = result.next_cursor;
  const rows = result.items
    .map(
      (g) =>
        `<li class="visit"><div><time>${date(g.opened_at)}</time><p>${esc(locationText(g))}</p></div><div><span class="badge">${labels[g.email_status] || "Unknown"}</span>${g.reason ? `<p class="hint">${esc(reasons[g.reason] || g.reason)}</p>` : ""}</div></li>`,
    )
    .join("");
  if (append) $("#visits").insertAdjacentHTML("beforeend", rows);
  else
    $("#visits").innerHTML =
      rows ||
      '<li class="muted">No link opens yet. A real phone scan that opens the link will appear here.</li>';
  $("#more-visits").hidden = !nextVisits;
}
async function details(id, v) {
  const c = await api(`/api/codes/${id}`);
  if (v !== version) return;
  currentCode = c;
  view.innerHTML = `<a class="back-link" href="#/">← All codes</a><div class="section-heading"><h2 id="detail-title">${esc(c.name)}</h2><span class="badge">${c.active ? "Active" : "Disabled"}</span></div><div class="detail-grid"><section class="panel"><h3>Edit this code</h3><p class="muted">Change the destination any time. Its printed image and permanent link stay the same.</p><form id="code-form">${fields(c)}<p id="form-error" role="alert" class="error-text"></p><button type="submit" class="primary">Save changes</button></form><div class="danger-row"><button id="toggle-code" class="text-button">${c.active ? "Disable code" : "Reactivate code"}</button><button data-duplicate="${c.id}" class="text-button">Duplicate</button></div></section><section class="panel qr-panel"><div class="qr-image" role="img" aria-label="QR code for ${esc(c.name)}">${svg(c.tracking_url)}</div><p class="eyebrow">Permanent tracking link</p><p class="tracking-url">${esc(c.tracking_url)}</p><div class="actions"><button data-download="svg">Download SVG</button><button data-download="png">Download PNG</button><button data-copy="${esc(c.tracking_url)}">Copy link</button></div><p id="destination-display" class="destination">${esc(c.destination)}</p><a id="destination-preview" href="${esc(c.destination)}" target="_blank" rel="noopener noreferrer">Preview destination ↗</a><p class="hint">Previewing and downloading do not count as opens. SVG is scalable; PNG is at least 1,600 px.</p>${apiBase.startsWith("http:") ? '<p class="notice warning">Local test code. Do not print for production.</p>' : ""}</section></div><section class="panel history"><div class="section-heading"><h3>${c.opens.toLocaleString()} QR link opens</h3><button id="refresh-visits">Refresh</button></div><p class="muted">Recent 90 days · America/New_York · “Sent to email service” means accepted by the provider, not confirmed inbox delivery.</p><ul id="visits"><li>Loading recent opens…</li></ul><button id="more-visits" hidden>Load older opens</button></section>`;
  wireForm(c);
  $("#toggle-code").addEventListener("click", async (event) => {
    if (
      currentCode.active &&
      !confirm(
        "Disable this code? Its link will show an unavailable page and stop new alerts. You can reactivate it later.",
      )
    )
      return;
    event.target.disabled = true;
    try {
      await api(`/api/codes/${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...currentCode, active: !currentCode.active }),
      });
      flash = currentCode.active ? "Code disabled." : "Code reactivated.";
      await route();
    } catch (err) {
      message(err.message, true);
      event.target.disabled = false;
    }
  });
  $("#more-visits").addEventListener("click", (event) =>
    runButton(event.target, () => visits(true)),
  );
  $("#refresh-visits").addEventListener("click", () => route());
  await visits();
}
function showSettings() {
  const s = settings;
  view.innerHTML = `<a href="#/" class="back-link">← All codes</a><h2>Settings</h2><section class="panel"><h3>Email alerts</h3><dl class="settings"><dt>Recipient</dt><dd>${esc(s.recipient || "Not configured")}</dd><dt>Service configuration</dt><dd>${s.email_ready ? "Ready to test" : "Setup needed"}</dd><dt>24-hour budget</dt><dd>${s.budget.day.used} / ${s.budget.day.limit} reserved</dd><dt>31-day budget</dt><dd>${s.budget.month.used} / ${s.budget.month.limit} reserved</dd><dt>Today’s logging allowance</dt><dd>${s.logging.used} / ${s.logging.limit} opens</dd></dl><p class="muted">${esc(s.readiness_note)}</p><p class="hint">${esc(s.budget.windows)} Retries extend reservations. Failed and suppressed sends may still use a reservation. The recipient is set securely on the server.</p><button id="test-email" ${s.email_ready ? "" : "disabled"}>Send test email</button><p class="hint">Sends a real email to the configured recipient. Once per five minutes; included in the email budget.</p><p id="test-result">${s.last_test ? `Last test: ${labels[s.last_test.status] || "Pending"} · ${date(s.last_test.created_at)} ${esc(reasons[s.last_test.reason] || "")}` : ""}</p><button id="refresh-settings">Refresh status</button></section><section class="panel"><h3>Recent delivery problems</h3>${s.problems.length ? `<ul>${s.problems.map((p) => `<li>${date(p.created_at)} · ${esc(reasons[p.reason] || p.reason || p.status)}</li>`).join("")}</ul>` : "<p>No recent delivery problems.</p>"}<p class="hint">Provider quotas can also be consumed by other apps on the account. No inbox tracking is enabled.</p></section>`;
  $("#test-email").addEventListener("click", (event) =>
    runButton(event.target, async () => {
      await api("/api/test-email", { method: "POST", body: "{}" });
      $("#test-result").textContent =
        "Test queued. Refresh status shortly to check provider acceptance.";
      message("Test email queued for the configured recipient.");
    }),
  );
  $("#refresh-settings").addEventListener("click", () => route());
}
async function route() {
  if (!csrf) return;
  const v = ++version;
  currentCode = null;
  message(flash);
  flash = "";
  view.innerHTML = '<section class="panel empty"><p>Loading…</p></section>';
  const path = location.hash.slice(1) || "/";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if (a.dataset.nav === (path === "/settings" ? "settings" : "codes"))
      a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  try {
    if (path === "/new") {
      creatingKey = crypto.randomUUID();
      view.innerHTML = `<a href="#/" class="back-link">← All codes</a><section class="panel new-form"><h2>New QR code</h2><p class="muted">Give your link a name. You can change its destination later.</p><form id="code-form">${fields()}<p id="form-error" role="alert" class="error-text"></p><button type="submit" class="primary">Create QR code</button></form></section>`;
      wireForm();
      view.querySelector("input").focus();
    } else if (/^\/codes\/[\w-]{22}$/.test(path))
      await details(path.split("/")[2], v);
    else if (path === "/settings") {
      await refreshSettings();
      if (v === version) showSettings();
    } else {
      view.innerHTML = `<div class="list-toolbar"><label class="search-label">Find a code<input id="search" type="search" placeholder="Search names, placements, destinations…" value="${esc(search)}"></label><button id="refresh-list">Refresh</button></div><div id="codes"><p>Loading your codes…</p></div><button id="more-codes" hidden>Load more codes</button>`;
      let timer;
      $("#search").addEventListener("input", (event) => {
        search = event.target.value;
        clearTimeout(timer);
        timer = setTimeout(() => {
          version++;
          loadCodes().catch((err) => message(err.message, true));
        }, 250);
      });
      $("#more-codes").addEventListener("click", (event) =>
        runButton(event.target, () => loadCodes(true)),
      );
      $("#refresh-list").addEventListener("click", () => route());
      await loadCodes();
    }
  } catch (err) {
    if (v === version) {
      message(err.message, true);
      if (view.textContent.includes("Loading"))
        view.innerHTML =
          '<section class="panel empty"><h2>Couldn’t load this view</h2><p>Please try again.</p><button id="retry-view">Retry</button></section>';
      $("#retry-view")?.addEventListener("click", route);
    }
  }
}
async function runButton(button, fn) {
  if (button.disabled) return;
  button.disabled = true;
  try {
    await fn();
  } catch (err) {
    message(err.message, true);
  } finally {
    button.disabled = false;
  }
}
view.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.copy)
    runButton(button, async () => {
      await navigator.clipboard.writeText(button.dataset.copy);
      message("Tracking link copied.");
    });
  if (button.dataset.download && currentCode)
    runButton(button, async () => {
      await download(currentCode, button.dataset.download);
      message("Image downloaded.");
    });
  if (button.dataset.duplicate)
    runButton(button, async () => {
      const id = button.dataset.duplicate,
        c = await api(`/api/codes/${id}`);
      if (!duplicateKeys.has(id)) duplicateKeys.set(id, crypto.randomUUID());
      const copy = await api("/api/codes", {
        method: "POST",
        headers: { "Idempotency-Key": duplicateKeys.get(id) },
        body: JSON.stringify({
          ...c,
          name: c.name.slice(0, 110) + " (copy)",
          active: true,
        }),
      });
      duplicateKeys.delete(id);
      flash = "Code duplicated with a new tracking link.";
      location.hash = `/codes/${copy.id}`;
    });
});
$("#logout").addEventListener("click", (event) =>
  runButton(event.target, async () => {
    await api("/auth/logout", { method: "POST", body: "{}" });
    version++;
    signedOut();
    message("Signed out.");
  }),
);
window.addEventListener("hashchange", route);
async function boot() {
  try {
    const s = await api("/api/session");
    csrf = s.csrf;
    $("#nav").hidden = false;
    $("#new-code").hidden = false;
    await route();
    await refreshSettings();
  } catch (err) {
    signedOut(
      err.message.includes("Sign in") || err.message.includes("session expired")
        ? ""
        : err.message,
    );
  }
}
window.addEventListener("pageshow", (event) => {
  if (event.persisted) boot();
});
setInterval(() => {
  if (csrf && !document.hidden)
    refreshSettings().catch((err) => message(err.message, true));
}, 60000);
boot();
