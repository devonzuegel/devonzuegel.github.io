import { clockLabel, eventTiming, HOUR } from './event-timing.js';
import { escapeHTML as esc } from './core.js?v=20261123-plan2';

export function weatherWindow(event) {
  const { start, end } = eventTiming(event);
  if (start === null) return null;
  return {from: Math.floor(start/HOUR)*HOUR-HOUR, to: end ?? start+4*HOUR, knownEnd: end !== null, start};
}
export function weatherCondition(code,day) {
  if(code===0)return [day?'☀':'☾',day?'Clear':'Clear night'];
  if([1,2].includes(code))return ['⛅','Partly cloudy'];
  if(code===3)return ['☁','Cloudy'];
  if([45,48].includes(code))return ['≋','Fog'];
  if([71,73,75,77,85,86].includes(code))return ['❄','Snow'];
  if([95,96,99].includes(code))return ['⛈','Thunderstorms'];
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return ['☂','Rain'];
  return ['—','Conditions unavailable'];
}
const clamp = (value, max) => Math.max(0, Math.min(value, max));
const numeric = Number.isFinite;
const read = (value, suffix = "") => numeric(value) ? Math.round(value) + suffix : "—";

function trend(hours, field, x, y, className) {
  let path = "";
  let previous = false;
  hours.forEach((hour, index) => {
    const value = hour[field];
    if (numeric(value)) path += (previous ? "L" : "M") + x(index) + " " + y(value);
    previous = numeric(value);
  });
  return '<path class="' + className + '" d="' + path + '"/>';
}

function weatherPlot(hours, window) {
  const column = 48;
  const height = 150;
  const width = hours.length * column;
  const x = i => i * column + column/2;
  const tempValues = hours.flatMap(hour => [hour.temp, hour.feels]).filter(numeric);
  const cold = Math.min(...tempValues, 45) - 3;
  const warm = Math.max(...tempValues, cold + 10) + 3;
  const windMax = Math.max(16, ...hours.flatMap(h => [h.wind, h.gust]).filter(numeric)) * 1.15;
  const wetMax = Math.max(.08, ...hours.map(h => h.precip).filter(numeric));
  const tempY = value => 119 - 94 * (value - cold) / (warm - cold);
  const windY = value => 145 - 104 * clamp(value, windMax) / windMax;
  const fromFirst = value => (value - Date.parse(hours[0].time + "Z")) / HOUR * column + column/2;
  const left = clamp(fromFirst(window.start), width);
  const right = clamp(fromFirst(window.to), width);
  const layers = hours.map((hour, i) => {
    const cloud = numeric(hour.cloud) ? 3 + clamp(hour.cloud, 100) * .39 : 0;
    const chance = numeric(hour.rain) ? clamp(hour.rain, 100) * .88 : 0;
    const amount = numeric(hour.precip) ? clamp(hour.precip, wetMax) / wetMax * 41 : 0;
    const uv = numeric(hour.uv) ? .14 + clamp(hour.uv, 11) / 11 * .83 : 0;
    return '<line class="weather-grid-line" x1="' + x(i) + '" x2="' + x(i) + '" y2="' + height + '"/>' +
      '<rect class="weather-cloud-layer" x="' + i*column + '" width="' + column + '" height="' + cloud + '"/>' +
      '<rect class="weather-rain-layer" x="' + i*column + '" y="' + (height - chance) + '" width="' + column + '" height="' + chance + '"/>' +
      '<rect class="weather-amount-layer" x="' + (x(i)-9) + '" y="' + (height - amount) + '" width="18" height="' + amount + '"/>' +
      '<rect class="weather-uv-layer" x="' + i*column + '" y="152" width="' + column + '" height="4" opacity="' + uv + '"/>';
  }).join("");
  return '<svg viewBox="0 0 ' + width + ' 156" preserveAspectRatio="none" aria-hidden="true">' +
    '<rect class="weather-show-band" x="' + left + '" width="' + Math.max(0, right-left) + '" height="' + height + '"/>' + layers +
    trend(hours,"temp",x,tempY,"weather-air-line") + trend(hours,"feels",x,tempY,"weather-air-line weather-dashed") +
    trend(hours,"wind",x,windY,"weather-wind-line") + trend(hours,"gust",x,windY,"weather-wind-line weather-dashed") +
    '</svg>';
}

function hourDetails(hour) {
  const [,condition] = weatherCondition(hour.code, hour.day);
  const direction = numeric(hour.direction) ? " " + ["N","NE","E","SE","S","SW","W","NW"][Math.round(hour.direction/45)%8] : "";
  const amount = numeric(hour.precip) ? " · " + hour.precip.toFixed(2) + " in" : "";
  return '<span class="weather-air-read">' + read(hour.temp,"°F") + ' · feels ' + read(hour.feels,"°F") + '</span>' +
    '<span class="weather-rain-read">' + read(hour.rain,"%") + ' rain' + amount + '</span>' +
    '<span>' + esc(condition) + (numeric(hour.cloud) ? ' · ' + read(hour.cloud,"%") + ' cloud' : '') + '</span>' +
    '<span class="weather-wind-read">' + read(hour.wind," mph") + direction + ' wind' + (numeric(hour.gust) ? ' · gusts ' + read(hour.gust," mph") : '') + '</span>' +
    (numeric(hour.uv) ? '<span class="weather-uv-read">UV ' + hour.uv.toFixed(1) + '</span>' : '');
}

export function weatherMarkup(data, event) {
  if (data.status !== "ok") return '<p class="media-notice">' + esc(data.message || "Forecast unavailable.") + '</p>';
  const window = weatherWindow(event);
  if (!window) return '<p class="media-notice">A start time is needed to show hourly weather for this concert.</p>';
  const hours = data.hours.filter(hour => {
    const time = Date.parse(hour.time + "Z");
    return time >= window.from && time <= window.to;
  });
  if (!hours.length) return '<p class="media-notice">The forecast does not cover these concert hours yet. Check back closer to the show.</p>';
  const selected = hours.reduce((best, hour, index) =>
    Math.abs(Date.parse(hour.time + "Z") - window.start) < Math.abs(Date.parse(hours[best].time + "Z") - window.start) ? index : best, 0);
  const ticks = hours.map((hour, index) => {
    const label = clockLabel(Date.parse(hour.time + "Z"));
    const nextDay = hour.time.slice(0,10) > event.date && hour.time.slice(11) === "00:00";
    return '<button type="button" class="weather-tick" data-weather-hour="' + index + '" aria-controls="weather-hour-' + index + '" aria-pressed="' + (index === selected) + '">' + label + (nextDay ? '<small>Next day</small>' : '') + '</button>';
  }).join("");
  const readouts = hours.map((hour, index) => '<div class="weather-hour-readout" id="weather-hour-' + index + '"' +
    (index === selected ? "" : " hidden") + '><strong>' + clockLabel(Date.parse(hour.time + "Z")) + '</strong>' + hourDetails(hour) + '</div>').join("");
  const context = window.knownEnd ? "Shaded area marks the listed show window." : "End time unknown. Shading runs four hours after the listed start.";
  const partial = Date.parse(hours[0].time + "Z") > window.from ||
    Date.parse(hours.at(-1).time + "Z") < Math.floor(window.to/HOUR)*HOUR;
  return '<p class="weather-context">' + context + (eventTiming(event).doors ? ' Start is doors opening.' : '') +
    (partial ? ' Only part of this window is available.' : '') + '</p>' +
    (data.outlook ? '<p class="weather-outlook">Early outlook · Hourly details may change.</p>' : '') +
    '<div class="weather-scroll"><div class="weather-chart" style="--hours:' + hours.length + ';--selected-hour:' + selected + '">' +
    '<div class="weather-plot">' + weatherPlot(hours,window) + '<div class="weather-cursor"></div></div>' +
    '<div class="weather-hours" role="group" aria-label="Forecast hour, venue local time">' + ticks + '</div></div></div>' +
    '<div class="weather-readouts" aria-live="polite">' + readouts + '</div>' +
    '<p class="weather-credit">Outdoor conditions · ' + esc(data.timezone) + ' · <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></p>';
}

export function bindWeatherStrip(root) {
  const chart = root.querySelector(".weather-chart");
  if (!chart) return;
  const plot = chart.querySelector(".weather-plot");
  const buttons = [...chart.querySelectorAll(".weather-tick")];
  const readouts = [...root.querySelectorAll(".weather-hour-readout")];
  let active = buttons.findIndex(button => button.getAttribute("aria-pressed") === "true");
  const select = index => {
    if (index === active) return;
    buttons[active].setAttribute("aria-pressed","false");
    readouts[active].hidden = true;
    buttons[index].setAttribute("aria-pressed","true");
    readouts[index].hidden = false;
    chart.style.setProperty("--selected-hour", index);
    active = index;
  };
  const pick = event => {
    const rect = plot.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;
    select(clamp(Math.floor(fraction * buttons.length), buttons.length - 1));
  };
  plot.addEventListener("pointermove", event => { if (event.pointerType === "mouse") pick(event); });
  plot.addEventListener("click", pick);
  buttons.forEach((button, index) => {
    button.addEventListener("focus", () => select(index));
    button.addEventListener("click", () => select(index));
    button.addEventListener("keydown", event => {
      if (!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length-1 :
        clamp(index + (event.key === "ArrowRight" ? 1 : -1), buttons.length-1);
      buttons[next].focus();
    });
  });
}
