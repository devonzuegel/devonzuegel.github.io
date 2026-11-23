import { sharedListLink } from "./list-metadata.js?v=20261122-ranges";
import { listDateError, listDateLabel, concertInRange } from "./list-dates.js";
export function sharedListTimestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(+date)) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
  }).formatToParts(date).map(p => [p.type, p.value]));
  return `${parts.weekday}, ${parts.month} ${parts.day} at ${parts.hour}:${parts.minute}${parts.dayPeriod.toLowerCase()} ${parts.timeZoneName}`;
}

import { dateLabel, timeLabel, mergeEvents, dayInZone } from "./core.js?v=20261123-duplicates";
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const linkFor = id => sharedListLink(id,location.origin);
export async function chooseConcertList(options) {
  const { store, concert, openModal, onCreate, onAdded, onSignIn } = options;
  if (!concert) return;
  if (!store.profile) {
    openModal("Add to a list", '<p>Your concert is saved on this device. Sign in to add it to a list you can share with friends.</p><button class="primary" id="list-sign-in">Sign in</button>');
    document.querySelector("#list-sign-in").onclick = () => onSignIn(() => chooseConcertList(options));
    return;
  }
  openModal("Add to a list", '<p role="status">Loading your lists…</p>');
  try {
    const { lists } = await store.apiCall("lists");
    openModal("Add to a list", `<p><strong>${esc(concert.title)}</strong> stays in your default Saved list.</p><div class="add-to-list-choices">${lists.map((list) => {
      const reason = mergeEvents([...list.events, concert]).length === mergeEvents(list.events).length ? "Already added"
        : list.dateRange && !concertInRange(concert, list.dateRange) ? "Outside these dates"
        : list.events.length >= 100 ? "List is full" : "";
      return `<button class="secondary" data-add-to-list="${esc(list.id)}" ${reason ? "disabled" : ""}><strong>${esc(list.title)}</strong><small>${esc(reason || (list.dateRange ? listDateLabel(list.dateRange) : `${list.events.length} concerts`))}</small></button>`;
    }).join("") || "<p>You haven’t created any lists yet.</p>"}</div><p id="add-to-list-status" role="status"></p><button class="primary" id="create-concert-list">Create a new list</button>`);
    document.querySelector("#create-concert-list").onclick = onCreate;
    document.querySelectorAll("[data-add-to-list]").forEach((button) => {
      button.onclick = async () => {
        button.disabled = true;
        const status = document.querySelector("#add-to-list-status");
        status.textContent = "Adding concert…";
        try {
          const list = await store.apiCall("add-to-list", { id: button.dataset.addToList, event: concert });
          if (status.isConnected) onAdded(list);
        } catch (error) {
          status.textContent = error.message + " Your default save is unchanged.";
          button.disabled = false;
        }
      };
    });
  } catch (error) {
    openModal("Add to a list", `<p role="alert">${esc(error.message)} Your concert is still in Saved.</p>`);
  }
}
export function concertChoices(choices, selected, isRange, now = new Date()) {
  const past = [], current = [];
  for (const event of choices) {
    const lastDay = event.endDate || event.date;
    const ended = event.endAt && Number.isFinite(Date.parse(event.endAt)) && Date.parse(event.endAt) < +now;
    (ended || (lastDay && lastDay < dayInZone(now, event.timezone || "America/New_York")) ? past : current).push(event);
  }
  const selectedPast = past.filter(event => selected.has(event.id)).length;
  return `${current.length || !past.length ? concertChoiceTable(current, selected, isRange) : ""}${past.length ? `<details class="shared-past-shows"><summary>Past shows (${past.length})<span class="shared-past-selected">${selectedPast ? ` · ${selectedPast} selected` : ""}</span></summary>${concertChoiceTable(past, selected, isRange)}</details>` : ""}`;
}
function concertChoiceTable(choices, selected, isRange) {
  if (!choices.length)
    return isRange
      ? "<p>No concerts match these dates and your current filters. You can still save the dates and add concerts later.</p>"
      : "<p>Save some concerts first, then add them here.</p>";
  const days = new Map();
  for (const event of choices) {
    const key = event.date || "";
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(event);
  }
  return `<table class="shared-choices-table"><thead><tr><th scope="col">Concert</th><th scope="col">Time</th><th scope="col">Venue</th><th scope="col">City</th></tr></thead>${[...days].map(([day, events]) => `<tbody><tr class="shared-day-heading"><th colspan="4" scope="rowgroup">${esc(day ? dateLabel(day, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Date TBA")}</th></tr>${events.map((e) => `<tr class="shared-choice-row"><td><label><input type="checkbox" name="concert" value="${esc(e.id)}" ${selected.has(e.id) ? "checked" : ""}><strong>${esc(e.title)}</strong></label></td><td class="shared-choice-time">${esc(timeLabel(e))}</td><td>${esc(e.venue?.name || "Venue TBA")}</td><td>${esc(e.venue?.locality || "—")}</td></tr>`).join("")}</tbody>`).join("")}</table>`;
}

export async function manageLists(options) {
  const { store, concerts, rangeConcerts = concerts, dateRange, createRange = false, createConcert = null, openModal, onSignIn } = options;
  if (!store.profile) {
    openModal(
      "Shared lists",
      '<p>Sign in to create lists that friends can view without an account.</p><button class="primary" id="list-sign-in">Sign in</button>',
    );
    document.querySelector("#list-sign-in").onclick = () => onSignIn(() => manageLists(options));
    return;
  }
  openModal("Shared lists", '<p role="status">Loading lists…</p>');
  try {
    if (createRange) edit(null, dateRange);
    else if (createConcert) edit(null);
    else {
      const { lists } = await store.apiCall("lists");
      showIndex(lists);
    }
  } catch (error) {
    openModal("Shared lists", `<p role="alert">${esc(error.message)}</p>`);
  }
  function showIndex(lists) {
    openModal(
      "Shared lists",
      `<p>Anyone with a link can view its selected concerts. Notes, ratings, and listening history stay private.</p><div class="form-actions"><button class="primary" id="new-range-list">New date-range list</button><button class="secondary" id="new-shared-list">Choose saved concerts</button></div><div class="shared-list-index">${lists.map((l) => `<article><div><strong>${esc(l.title)}</strong>${l.dateRange ? `<small>${esc(listDateLabel(l.dateRange))}</small>` : ""}<small>${l.events.length} concerts · Updated ${esc(new Date(l.updatedAt).toLocaleDateString())}</small></div><button class="secondary" data-edit-list="${esc(l.id)}">Edit / share</button></article>`).join("") || "<p>No shared lists yet.</p>"}</div>`,
    );
    document.querySelector("#new-shared-list").onclick = () => edit(null);
    document.querySelector("#new-range-list").onclick = () => edit(null, dateRange);
    document
      .querySelectorAll("[data-edit-list]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            edit(lists.find((l) => l.id === b.dataset.editList))),
      );
  }
  function edit(list, initialRange = list?.dateRange) {
    let range = initialRange ? { ...initialRange } : null;
    const pool = mergeEvents([
      ...new Map(
        [...(range ? rangeConcerts : concerts), ...(createConcert ? [createConcert] : []), ...(list?.events || [])].map((e) => [e.id, e]),
      ).values(),
     ]).sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.time || "").localeCompare(b.time || ""));
    let choices = range ? pool.filter((e) => concertInRange(e, range)) : pool;
    const selected = new Set(list ? list.events.map((e) => e.id) : range ? choices.map((e) => e.id) : createConcert ? [createConcert.id] : []);
    for (const event of pool) if (event.aliases?.some(id => selected.has(id))) selected.add(event.id);
    const initialTitle = list?.title || (range ? listDateLabel(range) : "");
    openModal(
      list ? "Edit shared list" : range ? "Save date-range list" : "New shared list",
      `<button class="text-button" id="all-shared-lists" type="button">All shared lists</button><form id="shared-list-form"><label>List name<input name="title" maxlength="100" required placeholder="Weekend concert ideas" value="${esc(initialTitle)}"></label>${range ? `<div class="shared-range-fields"><label>Start date<input type="date" name="from" value="${esc(range.from)}" required></label><label>End date<input type="date" name="to" value="${esc(range.to)}" required></label></div><p>Both dates are included. Changing dates selects matching concerts from your current cities and filters. Uncheck any you don’t want to share.</p><p>This list saves a snapshot; newly announced concerts aren’t added automatically. You can edit it later using the same link.</p>` : "<p>Select saved concerts. Updating this list keeps the same link.</p>"}<div class="shared-selection-actions"><span id="shared-selection-count" role="status"></span><button class="text-button" type="button" id="shared-select-all">Select all</button><button class="text-button" type="button" id="shared-clear-all">Clear selection</button></div><div class="shared-list-choices">${concertChoices(choices, selected, !!range)}</div><p id="shared-list-status" role="status"></p><button class="primary" type="submit">${list ? "Update list" : "Create share link"}</button></form>${list ? `<div class="shared-list-link"><label>Read-only link<input readonly id="shared-list-url" value="${esc(linkFor(list.id))}"></label><button class="secondary" id="copy-shared-list">Copy link</button><a href="${esc(linkFor(list.id))}" target="_blank" rel="noopener">Preview ↗</a><button class="text-button" id="revoke-shared-list">Disable link</button></div>` : ""}`,
    );
    document
      .querySelector("#shared-list-form")
      .closest(".modal")
      .classList.add("shared-list-editor");
    const form = document.querySelector("#shared-list-form"),
      status = document.querySelector("#shared-list-status");
    const submit = form.querySelector("[type=submit]");
    const updateSelection = () => {
      const count = form.querySelectorAll('[name="concert"]:checked').length;
      document.querySelector("#shared-selection-count").textContent = `${count} selected · up to 100 concerts`;
      const pastSection = form.querySelector('.shared-past-shows');
      if (pastSection) {
        const pastCount = pastSection.querySelectorAll('[name="concert"]:checked').length;
        pastSection.querySelector('.shared-past-selected').textContent = pastCount ? ` · ${pastCount} selected` : '';
      }
      const error = range ? listDateError(range) : "";
      submit.disabled = !!error || count > 100 || (!range && count === 0);
      status.textContent = error || (count > 100 ? "Choose up to 100 concerts, or narrow the dates or filters." : "");
    };
    document.querySelector("#all-shared-lists").onclick = async () => {
      try { showIndex((await store.apiCall("lists")).lists); }
      catch (error) { status.textContent = error.message; }
    };
    for (const [id, checked] of [["shared-select-all", true], ["shared-clear-all", false]]) {
      document.getElementById(id).onclick = () => {
        form.querySelectorAll('[name="concert"]').forEach((input) => { if (checked && input.closest(".shared-past-shows:not([open])")) return; input.checked = checked; });
        updateSelection();
      };
    }
    form.onchange = (event) => {
      if (range && ["from", "to"].includes(event.target.name)) {
        const previousLabel = listDateLabel(range);
        range = { from: form.elements.from.value, to: form.elements.to.value };
        choices = listDateError(range) ? [] : pool.filter((e) => concertInRange(e, range));
        if (form.elements.title.value === previousLabel && !listDateError(range))
          form.elements.title.value = listDateLabel(range);
        form.querySelector(".shared-list-choices").innerHTML = concertChoices(choices, new Set(choices.map((e) => e.id)), true);
      }
      updateSelection();
    };
    form.querySelector(".shared-list-choices").onclick = (event) => {
      if (event.target.closest("label, input")) return;
      const checkbox = event.target
        .closest(".shared-choice-row")
        ?.querySelector("input");
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        updateSelection();
      }
    };
    updateSelection();
    form.onsubmit = async (event) => {
      event.preventDefault();
      updateSelection();
      if (submit.disabled) return;
      submit.disabled = true;
      const ids = new Set(new FormData(form).getAll("concert"));
      try {
        const saved = await store.apiCall("save-list", {
          id: list?.id,
          title: new FormData(form).get("title"),
          ...(range ? { dateRange: range } : {}),
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
