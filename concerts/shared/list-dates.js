// Calendar dates are venue-local days, never instants in the viewer's time zone.
export function validListDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}

export function listDateError(range) {
  if (!validListDate(range?.from) || !validListDate(range?.to))
    return "Choose valid start and end dates.";
  if (range.from > range.to) return "The end date must be on or after the start date.";
  if (Date.parse(range.to) - Date.parse(range.from) > 366 * 86400000)
    return "Choose a range of one year or less.";
  return "";
}

export function concertInRange(event, range) {
  return validListDate(event.date) && event.date <= range.to &&
    (event.endDate || event.date) >= range.from;
}

export function listDateLabel(range) {
  if (listDateError(range)) return "";
  const format = (day) => new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(new Date(day + "T12:00:00Z"));
  return range.from === range.to ? format(range.from) : `${format(range.from)} → ${format(range.to)}`;
}
