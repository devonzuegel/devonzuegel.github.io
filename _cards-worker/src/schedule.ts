import { HttpError } from './core.ts';
export const ratings = ['again', 'hard', 'good', 'easy'] as const;
export type Rating = typeof ratings[number];
export function schedule(interval: number | null, ease: number | null, rating: Rating, at = new Date()) {
  if (!ratings.includes(rating)) throw new HttpError(400, 'Choose a recall rating.');
  const previous = Math.max(0, Number.isFinite(interval) ? interval! : 0);
  let nextEase = Math.max(1.3, Math.min(3.5, Number.isFinite(ease) ? ease! : 2.5));
  let days: number;
  if (rating === 'again') { days = 10 / 1440; nextEase = Math.max(1.3, nextEase - 0.2); }
  else if (rating === 'hard') { days = Math.max(1, Math.round(previous * 1.2)); nextEase = Math.max(1.3, nextEase - 0.15); }
  else if (rating === 'good') days = previous < 1 ? 1 : Math.max(previous + 1, Math.round(previous * nextEase));
  else { days = previous < 1 ? 4 : Math.max(previous + 1, Math.round(previous * nextEase * 1.3)); nextEase = Math.min(3.5, nextEase + 0.15); }
  days = Math.min(3650, days);
  return { due: new Date(at.getTime() + days * 86400000).toISOString(), interval: days, ease: Math.round(nextEase * 100) / 100, reviewed: at.toISOString() };
}
export function localClock(at: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', hourCycle:'h23' }).formatToParts(at);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}
