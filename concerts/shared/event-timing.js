export const HOUR = 3600000;

export function wallTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || "")) return null;
  const value = Date.parse(date + "T" + time + ":00Z");
  return Number.isFinite(value) ? value : null;
}

export function eventTiming(event) {
  const time = event.showTime || event.time || event.doorsTime;
  const start = wallTime(event.date, time);
  const doors = !event.showTime && (!event.time || event.timeKind === "doors");
  let end = null;
  if (start !== null && event.endAt && event.timezone) {
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: event.timezone, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      });
      const parts = Object.fromEntries(formatter.formatToParts(new Date(event.endAt)).map(p => [p.type, p.value]));
      const candidate = wallTime(parts.year + "-" + parts.month + "-" + parts.day, parts.hour + ":" + parts.minute);
      if (candidate !== null && candidate > start && candidate - start <= 24 * HOUR) end = candidate;
    } catch {
      // Older concert snapshots can contain invalid or absent end metadata.
    }
  }
  return { start, end, doors };
}

export function clockLabel(value) {
  const date = new Date(value);
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  return (hour % 12 || 12) + (minute ? ":" + String(minute).padStart(2, "0") : "") + (hour < 12 ? "am" : "pm");
}
