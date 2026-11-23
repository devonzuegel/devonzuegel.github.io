import { json } from './network.mjs';
import { concertWeather as forecast } from '../shared/weather-forecast.js';

export function concertWeather(params, options = {}) {
  return forecast(params, {fetchJSON: json, ...options});
}
