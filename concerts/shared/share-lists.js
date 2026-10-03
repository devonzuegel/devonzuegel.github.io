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
function concertChoices(choices, selected) {
  if (!choices.length)
    return "<p>Save some concerts first, then add them here.</p>";
  const days = new Map();
  for (const event of choices) {
    const key = event.date || "";
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(event);
  }
  return `<table class="shared-choices-table"><thead><tr><th scope="col">Concert</th><th scope="col">Time</th><th scope="col">Venue</th><th scope="col">City</th></tr></thead>${[...days].map(([day, events]) => `<tbody><tr class="shared-day-heading"><th colspan="4" scope="rowgroup">${esc(day ? dateLabel(day, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Date TBA")}</th></tr>${events.map((e) => `<tr class="shared-choice-row"><td><label><input type="checkbox" name="concert" value="${esc(e.id)}" ${selected.has(e.id) ? "checked" : ""}><strong>${esc(e.title)}</strong></label></td><td class="shared-choice-time">${esc(timeLabel(e))}</td><td>${esc(e.venue?.name || "Venue TBA")}</td><td>${esc(e.venue?.locality || "—")}</td></tr>`).join("")}</tbody>`).join("")}</table>`;
}

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
      `<form id="shared-list-form"><label>List name<input name="title" maxlength="100" required placeholder="Weekend concert ideas" value="${esc(list?.title || "")}"></label><p>Select saved concerts. Updating this list keeps the same link.</p><div class="shared-list-choices">${concertChoices(choices, selected)}</div><p id="shared-list-status" role="status"></p><button class="primary" type="submit" ${choices.length ? "" : "disabled"}>${list ? "Update list" : "Create share link"}</button></form>${list ? `<div class="shared-list-link"><label>Read-only link<input readonly id="shared-list-url" value="${esc(linkFor(list.id))}"></label><button class="secondary" id="copy-shared-list">Copy link</button><a href="${esc(linkFor(list.id))}" target="_blank" rel="noopener">Preview ↗</a><button class="text-button" id="revoke-shared-list">Disable link</button></div>` : ""}`,
    );
    document
      .querySelector("#shared-list-form")
      .closest(".modal")
      .classList.add("shared-list-editor");
    const form = document.querySelector("#shared-list-form"),
      status = document.querySelector("#shared-list-status");
    form.querySelector(".shared-list-choices").onclick = (event) => {
      if (event.target.closest("label, input")) return;
      const checkbox = event.target
        .closest(".shared-choice-row")
        ?.querySelector("input");
      if (checkbox) checkbox.checked = !checkbox.checked;
    };
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
