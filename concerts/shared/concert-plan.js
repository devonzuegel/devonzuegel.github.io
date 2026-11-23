import { sharedNoteFor } from "./shared-notes.js";
import { dateLabel, timeLabel } from './core.js?v=20261123-plan';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function plannedEvents(events, ids = []) {
  const selected = new Set(ids);
  return events.filter(e => selected.has(e.id) || e.aliases?.some(id => selected.has(id)))
    .sort((a,b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));
}
// Calendar cards show published start times, never invented set lengths.
export function planMarkup(events, ids, {interactive = true, notes = {}} = {}) {
  const planned = plannedEvents(events, ids);
  if (!planned.length) return '';
  const days = new Map();
  for (const e of planned) {
    const day = e.date || '';
    if (!days.has(day)) days.set(day, []);
    days.get(day).push(e);
  }
  return `<section class="concert-plan" aria-label="Proposed plan"><div class="plan-heading"><h2>★ Proposed plan</h2><span>${planned.length} starred ${planned.length === 1 ? 'show' : 'shows'}</span></div><p>The shows proposed for this trip. Times are as listed by the venue, in local time; doors times are labeled.</p><div class="plan-calendar">${[...days].map(([day, shows]) => `<section class="plan-day"><h3>${esc(day ? dateLabel(day, {weekday:'short', month:'short', day:'numeric'}) : 'Date TBA')}</h3><div class="plan-day-shows">${shows.map(e => `<${interactive ? 'button type="button"' : 'div'} class="plan-event" ${interactive ? `data-action="open" data-id="${esc(e.id)}"` : ''}><span class="plan-time">${esc(timeLabel(e))}</span><strong>★ ${esc(e.title)}</strong><span>${esc(e.venue?.name || 'Venue TBA')}</span>${sharedNoteFor(e,{},notes) ? `<span class="plan-shared-note">${esc(sharedNoteFor(e,{},notes))}</span>` : ''}${e.venue?.locality ? `<small>${esc(e.venue.locality)}</small>` : ''}</${interactive ? 'button' : 'div'}>`).join('')}</div></section>`).join('')}</div></section>`;
}
