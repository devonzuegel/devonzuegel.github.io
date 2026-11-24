import type { Env } from './core.ts';
import { ratings } from './schedule.ts';

const dayMs = 86_400_000;
const historyDays = 90;

export async function progress(env: Env, now = Date.now()) {
  const settings = await env.DB.prepare('SELECT timezone FROM settings WHERE id=1').first<{ timezone: string }>();
  const timezone = settings?.timezone ?? 'America/New_York';
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  function dateKey(timestamp: number) {
    const parts = Object.fromEntries(formatter.formatToParts(timestamp).map(({type, value}) => [type, value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  // Step through calendar dates in UTC after determining the owner's local date.
  const today = Date.parse(`${dateKey(now)}T00:00:00Z`);
  const first = today - (historyDays - 1) * dayMs;
  const days = Array.from({ length: historyDays }, (_, i) => ({
    date: new Date(first + i * dayMs).toISOString().slice(0, 10),
    count: 0,
  }));
  const byDay = new Map(days.map(day => [day.date, day]));
  const last30 = days.at(-30)!.date;
  const last7 = days.at(-7)!.date;
  const cards = new Set<string>();
  const ratingCounts = { again: 0, hard: 0, good: 0, easy: 0 };
  let week = 0, month = 0;
  // Include a buffer for timezones ahead of UTC, then filter by exact local dates.
  const { results } = await env.DB.prepare(
    'SELECT card_id, rating, reviewed_at FROM review_activity WHERE reviewed_at >= ? AND reviewed_at <= ?',
  ).bind(first - dayMs, now).all<{ card_id: string; rating: typeof ratings[number]; reviewed_at: number }>();
  for (const review of results) {
    const key = dateKey(review.reviewed_at);
    const day = byDay.get(key);
    if (!day) continue;
    day.count++;
    if (key >= last7) week++;
    if (key >= last30) {
      month++;
      cards.add(review.card_id);
      if (ratings.includes(review.rating)) ratingCounts[review.rating]++;
    }
  }

  let run = 0, bestStreak = 0;
  for (const day of days) {
    run = day.count ? run + 1 : 0;
    bestStreak = Math.max(bestStreak, run);
  }
  let currentStreak = 0;
  const start = days.at(-1)!.count ? days.length - 1 : days.length - 2;
  for (let i = start; i >= 0 && days[i].count; i--) currentStreak++;

  return { timezone, days: days.slice(-30), today: days.at(-1)!.count, week, month,
    uniqueCards: cards.size, ratingCounts, currentStreak, bestStreak };
}
