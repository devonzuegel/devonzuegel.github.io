import { addDays, dayInZone } from "./core.js";
export function monthOffset(month, offset) {
  const d = new Date(month + "-01T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 7);
}
export function orderedRange(a, b) {
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}
const label = (day) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(day + "T12:00:00Z"));
export function openRangePicker(trigger, initial, apply) {
  document.querySelector("#concert-range-picker")?.remove();
  const root = document.createElement("div");
  root.id = "concert-range-picker";
  root.className = "range-picker";
  root.setAttribute("popover", "auto");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Choose a date range");
  let month = initial.from.slice(0, 7),
    from = initial.from,
    to = initial.to,
    choosingEnd = false;
  document.body.append(root);
  const tooLong = () =>
    to && Date.parse(to) - Date.parse(from) > 366 * 86400000;
  function render(focusDay, focusAction) {
    let calendars = "";
    for (let i = 0; i < 3; i++) {
      const m = monthOffset(month, i),
        first = m + "-01";
      const count = new Date(
        Date.parse(monthOffset(m, 1) + "-01T12:00:00Z") - 86400000,
      ).getUTCDate();
      const gap = (new Date(first + "T12:00:00Z").getUTCDay() + 6) % 7;
      let cells = "<span></span>".repeat(gap);
      for (let d = 1; d <= count; d++) {
        const day = m + "-" + String(d).padStart(2, "0"),
          selected = day === from || day === to;
        cells += `<button type="button" class="range-day ${selected ? "range-endpoint" : ""} ${to && day >= from && day <= to ? "range-between" : ""}" data-day="${day}" aria-label="${label(day)}" aria-pressed="${selected}" ${day === dayInZone() ? 'aria-current="date"' : ""}>${d}</button>`;
      }
      calendars += `<section class="range-month"><h3>${new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(first + "T12:00:00Z"))}</h3><div class="range-weekdays" aria-hidden="true">${["M", "T", "W", "T", "F", "S", "S"].map((s) => `<span>${s}</span>`).join("")}</div><div class="range-days">${cells}</div></section>`;
    }
    root.innerHTML = `<header class="range-picker-header"><strong>Select dates</strong><div><button type="button" data-range-action="prev" aria-label="Previous month">‹</button><button type="button" data-range-action="next" aria-label="Next month">›</button><button type="button" data-range-action="close" aria-label="Close date picker">×</button></div></header><p class="range-instruction" aria-live="polite">${choosingEnd ? "Choose an end date." : "Choose a start date, then an end date."}</p><div class="range-months">${calendars}</div><footer class="range-picker-footer"><span aria-live="polite">${label(from)}${to ? " → " + label(to) : " → …"}${tooLong() ? "<br>Choose a range of one year or less." : ""}</span><div><button type="button" class="secondary" data-range-action="close">Cancel</button><button type="button" class="primary" data-range-action="apply" ${!to || tooLong() ? "disabled" : ""}>Apply dates</button></div></footer>`;
    if (focusDay)
      root
        .querySelector(`[data-day="${focusDay}"]`)
        ?.focus({ preventScroll: true });
    if (focusAction)
      root
        .querySelector(`[data-range-action="${focusAction}"]`)
        ?.focus({ preventScroll: true });
  }
  function position() {
    const r = trigger.getBoundingClientRect();
    const left = Math.max(
      12,
      Math.min(r.right - root.offsetWidth, innerWidth - root.offsetWidth - 12),
    );
    root.style.left = left + "px";
    root.style.top =
      Math.max(
        12,
        Math.min(r.bottom + 8, innerHeight - root.offsetHeight - 12),
      ) + "px";
  }
  root.addEventListener("click", (e) => {
    const day = e.target.closest("[data-day]")?.dataset.day;
    const action = e.target.closest("[data-range-action]")?.dataset.rangeAction;
    if (day) {
      if (!choosingEnd) {
        from = day;
        to = null;
        choosingEnd = true;
      } else {
        ({ from, to } = orderedRange(from, day));
        choosingEnd = false;
      }
      render(day);
      position();
    } else if (action === "prev" || action === "next") {
      month = monthOffset(month, action === "prev" ? -1 : 1);
      render(null, action);
      position();
    } else if (action === "close") root.hidePopover();
    else if (action === "apply" && to && !tooLong()) {
      root.hidePopover();
      apply({ from, to });
    }
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      root.hidePopover();
      return;
    }
    const day = e.target.dataset.day,
      offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (day && e.key in offsets) {
      e.preventDefault();
      const next = addDays(day, offsets[e.key]);
      if (next.slice(0, 7) < month) month = next.slice(0, 7);
      if (next.slice(0, 7) > monthOffset(month, 2))
        month = monthOffset(next.slice(0, 7), -2);
      render(next);
      position();
    }
  });
  root.addEventListener("toggle", (e) => {
    const open = e.newState === "open";
    trigger.setAttribute("aria-expanded", String(open));
    if (!open) {
      window.removeEventListener("resize", position);
      if (trigger.isConnected) trigger.focus({ preventScroll: true });
    }
  });
  render();
  root.showPopover();
  position();
  window.addEventListener("resize", position);
  (
    root.querySelector(`[data-day="${from}"]`) || root.querySelector("button")
  ).focus({ preventScroll: true });
}
