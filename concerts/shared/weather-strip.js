import { clockLabel, scheduleTiming, HOUR } from './event-timing.js?v=20261123-estimates';
import { escapeHTML as esc } from './core.js?v=20261123-plan2';

export function weatherWindow(event) {
  const { start, end, estimated, doors } = scheduleTiming(event);
  if (start === null) return null;
  return {from: Math.floor(start/HOUR)*HOUR-HOUR, to: end, knownEnd: !estimated, start, doors};
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

const comfortLabels = {
  very: "Very comfortable",
  okay: "Okay",
  uncomfortable: "Uncomfortable",
  unknown: "Insufficient data",
};

// Estimate how the hour might feel at an outdoor show using the most limiting condition.
export function outdoorComfort(hour) {
  const temperature = numeric(hour.feels) ? hour.feels : hour.temp;
  const hasRain = numeric(hour.rain) || numeric(hour.precip);
  const hasWind = numeric(hour.wind) || numeric(hour.gust);
  const [, condition] = weatherCondition(hour.code, hour.day);
  const limitingConditions = [
    [condition === "Thunderstorms", false, "Thunderstorms are forecast."],
    [numeric(temperature) && temperature < 50, numeric(temperature) && temperature < 60, "It may feel chilly."],
    [numeric(temperature) && temperature >= 88, numeric(temperature) && temperature > 80, "It may feel hot."],
    [hour.precip >= 0.10 || hour.rain >= 70, hour.precip >= 0.01 || hour.rain >= 30,
      hour.rain >= 70 || hour.precip >= 0.10 ? "Rain is likely or measurable." : "There’s a chance of rain."],
    [hour.wind >= 23 || hour.gust >= 32, hour.wind >= 13 || hour.gust >= 23,
      hour.wind >= 23 || hour.gust >= 32 ? "Strong wind or gusts." : "Wind or gusts may be noticeable."],
  ];
  const hard = limitingConditions.find(([uncomfortable]) => uncomfortable);
  if (hard) return {level:"uncomfortable", reason:hard[2]};
  if (!numeric(temperature) || !hasRain || !hasWind) {
    return {level:"unknown", reason:"Hourly temperature, rain, or wind data is missing."};
  }
  const soft = limitingConditions.find(([, okay]) => okay);
  if (soft) return {level:"okay", reason:soft[2]};
  return {level:"very", reason:"Mild, with little rain and light wind."};
}

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

function hourDetails(hour, floating = false) {
  const [,condition] = weatherCondition(hour.code, hour.day);
  const direction = numeric(hour.direction) ? " " + ["N","NE","E","SE","S","SW","W","NW"][Math.round(hour.direction/45)%8] : "";
  const amount = numeric(hour.precip) ? " · " + hour.precip.toFixed(2) + " in" : "";
  if (floating) {
    const tag = (text, cls = "") => '<span class="' + cls + '">' + esc(text) + '</span>';
    const air = (value, label, cls) => numeric(value) ? tag(label + " " + read(value,"°F"),cls) : "";
    return (numeric(hour.rain) || numeric(hour.precip) ? tag("Rain " + read(hour.rain,"%") + amount,"weather-rain-read") : "") +
      air(hour.feels,"Feels like","weather-feels-read") +
      (numeric(hour.cloud) ? tag("Cloud cover " + read(hour.cloud,"%")) : numeric(hour.code) ? tag(condition) : "") +
      air(hour.temp,"Air","weather-air-read") +
      (numeric(hour.wind) ? tag("Wind " + read(hour.wind," mph") + direction +
        (numeric(hour.gust) ? " · gusts " + read(hour.gust," mph") : ""), "weather-wind-read") : "") +
      (numeric(hour.uv) ? tag("UV " + hour.uv.toFixed(1),"weather-uv-read") : "");
  }
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
  const comfort = hours.map(outdoorComfort);
  const ticks = hours.map((hour, index) => {
    const label = clockLabel(Date.parse(hour.time + "Z"));
    const nextDay = hour.time.slice(0,10) > event.date && hour.time.slice(11) === "00:00";
    const {level} = comfort[index];
    const accessibleLabel = label + (nextDay ? " next day" : "") + " · " + comfortLabels[level];
    return '<button type="button" class="weather-tick comfort-' + level + '" data-weather-hour="' + index +
      '" aria-label="' + accessibleLabel + '" aria-controls="weather-hour-' + index + '" aria-pressed="' + (index === selected) +
      '">' + label + (nextDay ? '<small>Next day</small>' : '') + '</button>';
  }).join("");
  const readouts = hours.map((hour, index) => {
    const {level,reason} = comfort[index];
    return '<div class="weather-hour-readout" id="weather-hour-' + index + '"' + (index === selected ? "" : " hidden") +
      '><strong>' + clockLabel(Date.parse(hour.time + "Z")) + '</strong>' + hourDetails(hour) +
      '<div class="weather-comfort-detail comfort-' + level + '"><strong>' + comfortLabels[level] +
      (level === "unknown" ? "" : " outdoors") + '</strong><span>' + esc(reason) + '</span></div>' +
      '<template>' + hourDetails(hour, true) + '</template></div>';
  }).join("");
  const legend = Object.entries(comfortLabels).filter(([level]) => level !== "unknown" ||
    comfort.some(hour => hour.level === level)).map(([level,label]) =>
    '<li class="comfort-' + level + '">' + label + '</li>').join("");
  const context = window.knownEnd ? "Shaded area marks the listed show window." : "Shaded area marks the estimated show window.";
  const partial = Date.parse(hours[0].time + "Z") > window.from ||
    Date.parse(hours.at(-1).time + "Z") < Math.floor(window.to/HOUR)*HOUR;
  return '<p class="weather-context">' + context + (window.doors ? ' Start is doors opening.' : '') +
    (partial ? ' Only part of this window is available.' : '') + '</p>' +
    (data.outlook ? '<p class="weather-outlook">Early outlook · Hourly details may change.</p>' : '') +
    '<div class="weather-scroll"><div class="weather-chart" style="--hours:' + hours.length + ';--selected-hour:' + selected + '">' +
    '<div class="weather-plot">' + weatherPlot(hours,window) + '<div class="weather-cursor"></div><div class="weather-float" aria-hidden="true" hidden></div></div>' +
    '<div class="weather-hours" role="group" aria-label="Forecast hour, venue local time">' + ticks + '</div></div></div>' +
    '<ul class="weather-comfort-legend" aria-label="Estimated outdoor comfort">' + legend + '</ul>' +
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
  const scroll = root.querySelector(".weather-scroll");
  const labels = plot.querySelector(".weather-float");
  let labeledHour = -1;
  const showLabels = index => {
    select(index);
    if (labeledHour !== index) {
      labels.replaceChildren(readouts[index].querySelector("template").content.cloneNode(true));
      labeledHour = index;
    }
    labels.hidden = !labels.childElementCount;
    if (labels.hidden) return;
    const inset = 5;
    const viewportLeft = Math.max(0, scroll.getBoundingClientRect().left - plot.getBoundingClientRect().left);
    const viewportRight = viewportLeft + scroll.clientWidth;
    labels.style.maxWidth = Math.max(0, scroll.clientWidth - 2 * inset) + "px";
    const anchor = (index + .5) * plot.clientWidth / buttons.length;
    const width = labels.offsetWidth;
    const preferred = anchor + 8 + width <= viewportRight ? anchor + 8 : anchor - width - 8;
    labels.style.left = Math.max(viewportLeft + inset, Math.min(preferred, viewportRight - width - inset)) + "px";
  };
  const hideLabels = () => { labels.hidden = true; };
  const pick = event => {
    const rect = plot.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;
    showLabels(clamp(Math.floor(fraction * buttons.length), buttons.length - 1));
  };
  plot.addEventListener("pointermove", event => { if (event.pointerType === "mouse") pick(event); });
  plot.addEventListener("pointerleave", event => { if (event.pointerType === "mouse") hideLabels(); });
  plot.addEventListener("click", pick);
  scroll.addEventListener("scroll", () => { if (!labels.hidden) showLabels(active); });
  buttons.forEach((button, index) => {
    button.addEventListener("pointerenter", event => { if (event.pointerType === "mouse") select(index); });
    button.addEventListener("focus", () => showLabels(index));
    button.addEventListener("blur", hideLabels);
    button.addEventListener("click", () => showLabels(index));
    button.addEventListener("keydown", event => {
      if (event.key === "Escape" && !labels.hidden) {
        event.stopPropagation();
        hideLabels();
        return;
      }
      if (!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length-1 :
        clamp(index + (event.key === "ArrowRight" ? 1 : -1), buttons.length-1);
      buttons[next].focus();
      showLabels(next);
    });
  });
}
