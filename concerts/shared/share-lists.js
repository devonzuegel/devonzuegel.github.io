import { dateLabel, timeLabel } from "./core.js";
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const linkFor = (id) => {
  const u = new URL("./", location.href);
  u.searchParams.set("list", id);
  return u.href;
};
export async function manageLists({ store, concerts, openModal }) {
  if (!store.profile) {
    openModal(
      "Shared lists",
      '<p>Sign in to create lists that friends can view without an account.</p><button class="primary" data-action="profile">Sign in</button>',
    );
    return;
  }
  openModal("Shared lists", '<p role="status">Loading lists…</p>');
  try {
    const { lists } = await store.apiCall("lists");
    showIndex(lists);
  } catch (error) {
    openModal("Shared lists", `<p role="alert">${esc(error.message)}</p>`);
  }
  function showIndex(lists) {
    openModal(
      "Shared lists",
      `<p>Anyone with a link can view its selected concerts. Notes, ratings, and listening history stay private.</p><button class="primary" id="new-shared-list">New list</button><div class="shared-list-index">${lists.map((l) => `<article><strong>${esc(l.title)}</strong><small>${l.events.length} concerts · Updated ${esc(new Date(l.updatedAt).toLocaleDateString())}</small><button class="secondary" data-edit-list="${esc(l.id)}">Edit / share</button></article>`).join("") || "<p>No shared lists yet.</p>"}</div>`,
    );
    document.querySelector("#new-shared-list").onclick = () => edit(null);
    document
      .querySelectorAll("[data-edit-list]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            edit(lists.find((l) => l.id === b.dataset.editList))),
      );
  }
  function edit(list) {
    const choices = [
      ...new Map(
        [...(list?.events || []), ...concerts].map((e) => [e.id, e]),
      ).values(),
    ].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const selected = new Set(list?.events.map((e) => e.id) || []);
    openModal(
      list ? "Edit shared list" : "New shared list",
      `<form id="shared-list-form"><label>List name<input name="title" maxlength="100" required placeholder="Weekend concert ideas" value="${esc(list?.title || "")}"></label><p>Select saved concerts. Updating this list keeps the same link.</p><div class="shared-list-choices">${choices.map((e) => `<label><input type="checkbox" name="concert" value="${esc(e.id)}" ${selected.has(e.id) ? "checked" : ""}><span><strong>${esc(e.title)}</strong><small>${esc(e.date ? dateLabel(e.date, { month: "short", day: "numeric", year: "numeric" }) : "Date TBA")} · ${esc(e.venue?.name)} · ${esc(e.venue?.locality)}</small></span></label>`).join("") || "<p>Save some concerts first, then add them here.</p>"}</div><p id="shared-list-status" role="status"></p><button class="primary" type="submit" ${choices.length ? "" : "disabled"}>${list ? "Update list" : "Create share link"}</button></form>${list ? `<div class="shared-list-link"><label>Read-only link<input readonly id="shared-list-url" value="${esc(linkFor(list.id))}"></label><button class="secondary" id="copy-shared-list">Copy link</button><a href="${esc(linkFor(list.id))}" target="_blank" rel="noopener">Preview ↗</a><button class="text-button" id="revoke-shared-list">Disable link</button></div>` : ""}`,
    );
    const form = document.querySelector("#shared-list-form"),
      status = document.querySelector("#shared-list-status");
    form.onsubmit = async (event) => {
      event.preventDefault();
      const submit = form.querySelector("[type=submit]");
      submit.disabled = true;
      const ids = new Set(new FormData(form).getAll("concert"));
      try {
        const saved = await store.apiCall("save-list", {
          id: list?.id,
          title: new FormData(form).get("title"),
          events: choices.filter((e) => ids.has(e.id)),
        });
        edit(saved);
        document.querySelector("#shared-list-status").textContent =
          "List saved. Anyone with the link can view it.";
      } catch (error) {
        status.textContent = error.message;
        submit.disabled = false;
      }
    };
    if (list) {
      document.querySelector("#copy-shared-list").onclick = async () => {
        try {
          await navigator.clipboard.writeText(linkFor(list.id));
          status.textContent = "Link copied.";
        } catch {
          document.querySelector("#shared-list-url").select();
          status.textContent = "Copy the selected link.";
        }
      };
      document.querySelector("#revoke-shared-list").onclick = async (event) => {
        event.target.disabled = true;
        try {
          await store.apiCall("revoke-list", { id: list.id });
          const { lists } = await store.apiCall("lists");
          showIndex(lists);
        } catch (error) {
          status.textContent = error.message;
          event.target.disabled = false;
        }
      };
    }
  }
}
export async function renderSharedList(id) {
  const app = document.querySelector("#app");
  app.innerHTML =
    '<main id="main" class="public-concert-list"><p role="status">Loading shared list…</p></main>';
  try {
    const u = new URL(window.CONCERTS_CONFIG.apiBase, location.href);
    u.searchParams.set("action", "shared-list");
    u.searchParams.set("id", id);
    const response = await fetch(u, { signal: AbortSignal.timeout(18000) });
    const list = await response.json();
    if (!response.ok) throw new Error(list.error || "List unavailable.");
    document.title = list.title + " · Concert Tracker";
    const safe = (value) => {
      try {
        const u = new URL(value);
        return ["https:", "http:"].includes(u.protocol) ? u.href : "";
      } catch {
        return "";
      }
    };
    app.innerHTML = `<main id="main" class="public-concert-list"><a href="./">Concert Tracker</a><h1>${esc(list.title)}</h1><p>${list.events.length} ${list.events.length === 1 ? "concert" : "concerts"} · Read-only list · Updated ${esc(new Date(list.updatedAt).toLocaleDateString())}</p>${list.events
      .slice()
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .map(
        (e) =>
          `<article><div><small>${esc(e.date ? dateLabel(e.date, { month: "short", day: "numeric", year: "numeric" }) : "Date TBA")}${e.endDate && e.endDate !== e.date ? " – " + esc(dateLabel(e.endDate, { month: "short", day: "numeric", year: "numeric" })) : ""} · ${esc(timeLabel(e))}${e.timezone ? " · " + esc(e.timezone === "America/Los_Angeles" ? "Pacific time" : e.timezone === "America/New_York" ? "Eastern time" : e.timezone) : ""}</small><h2>${esc(e.title)}</h2>${e.status && e.status !== "scheduled" ? `<p><strong>${esc(e.status === "soldout" ? "Sold out" : e.status)}</strong></p>` : ""}<p>${esc(e.venue?.name)}${e.venue?.locality ? " · " + esc(e.venue.locality) : ""}</p>${e.genres?.length ? `<p>${e.genres.map(esc).join(" · ")}</p>` : ""}</div><div class="shared-concert-actions">${safe(e.ticketUrl) ? `<a class="primary" href="${esc(safe(e.ticketUrl))}" target="_blank" rel="noopener">Tickets ↗</a>` : ""}<a class="secondary" href="./?concert=${encodeURIComponent(e.id)}" target="_blank" rel="noopener">Concert details ↗</a></div></article>`,
      )
      .join(
        "",
      )}<p class="media-notice">Check the ticket provider for current times and availability.</p></main>`;
  } catch (error) {
    app.innerHTML = `<main id="main" class="public-concert-list"><h1>Shared list unavailable</h1><p role="alert">${esc(error.message)}</p><a href="./">Open Concert Tracker</a></main>`;
  }
}
