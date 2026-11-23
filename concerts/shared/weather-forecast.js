import { validListDate } from './list-dates.js';
const cache = new Map();
async function browserJSON(url) {
  const response = await fetch(url, {signal: AbortSignal.timeout(6500)});
  if (!response.ok) throw new Error('Weather forecast is temporarily unavailable.');
  return response.json();
}
const fields = {
  temp: 'temperature_2m',
  feels: 'apparent_temperature',
  rain: 'precipitation_probability',
  precip: 'precipitation',
  cloud: 'cloud_cover',
  wind: 'wind_speed_10m',
  gust: 'wind_gusts_10m',
  direction: 'wind_direction_10m',
  uv: 'uv_index',
  code: 'weather_code',
};

export async function concertWeather(params, { now = new Date(), fetchJSON = browserJSON } = {}) {
  const lat = Number(params.lat), lng = Number(params.lng), date = params.date;
  if (params.lat == null || params.lng == null || params.lat === '' || params.lng === '' || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>90 || Math.abs(lng)>180 || !validListDate(date))
    throw Object.assign(new Error('A valid venue location and concert date are required.'), {status:400});
  let timezone = params.timezone || 'America/New_York';
  let today;
  try { today = new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
  catch { throw Object.assign(new Error('Invalid venue timezone.'), {status:400}); }
  const days = Math.round((Date.parse(date)-Date.parse(today))/86400000);
  if (days < 0) return {status:'past', message:'This show is in the past. An upcoming forecast is no longer available.'};
  if (days > 15) return {status:'too-early', message:'Hourly forecasts become available about 16 days before the show. Check back closer to the date.'};
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${timezone},${today}`;
  const old = cache.get(key);
  if (old && +now-old.at < 30*60000) return {...old.data, outlook:days>7};
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  for (const [k,v] of Object.entries({latitude:lat.toFixed(3),longitude:lng.toFixed(3),forecast_days:16,timezone,temperature_unit:'fahrenheit',wind_speed_unit:'mph',precipitation_unit:'inch',hourly:[...Object.values(fields),'is_day'].join(',')})) u.searchParams.set(k,v);
  const raw = await fetchJSON(u.href);
  if (!Array.isArray(raw.hourly?.time)) throw new Error('Weather forecast is temporarily unavailable.');
  const h=raw.hourly;
  const numeric=(v)=>typeof v==='number' && Number.isFinite(v) ? v : null;
  const data={status:'ok',timezone:raw.timezone,updatedAt:now.toISOString(),hours:h.time.map((time,i)=>({time,...Object.fromEntries(Object.entries(fields).map(([key,field])=>[key,numeric(h[field]?.[i])])),day:h.is_day?.[i]===1}))};
  if(cache.size>=200)cache.delete(cache.keys().next().value);
  cache.set(key,{at:+now,data});
  return {...data,outlook:days>7};
}
