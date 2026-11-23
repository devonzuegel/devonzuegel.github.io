import { addMapboxBasemap } from "./mapbox-basemap.js?v=20260922-minimap-logo";

const groups = new WeakMap();
const routes = new Map();
const modes = ["walking", "driving"];
const modeLabel = { walking:"Walk", driving:"Drive" };
const routeColors = { walking:"#bc702b", driving:"#477ccb" };
const position = stop => [stop.lat, stop.lng];
const locationKey = stop => stop.lat.toFixed(5) + "," + stop.lng.toFixed(5);
const located = stop => stop.lat !== null && stop.lng !== null;
const distanceLabel = route => route ? (route.distance/1609.344).toFixed(2) + " mi" : "unavailable";

function requestRoute(profile, from, to, token) {
  if (!located(from) || !located(to) || !token?.startsWith("pk.")) return Promise.resolve(null);
  if (locationKey(from) === locationKey(to)) return Promise.resolve({distance:0,duration:0,coordinates:[]});
  const key = profile + ":" + locationKey(from) + ";" + locationKey(to);
  if (routes.has(key)) return routes.get(key);
  const coordinates = from.lng + "," + from.lat + ";" + to.lng + "," + to.lat;
  const url = new URL("https://api.mapbox.com/directions/v5/mapbox/" + profile + "/" + coordinates);
  url.search = new URLSearchParams({access_token:token,geometries:"geojson",overview:"simplified"});
  const request = fetch(url, {signal:AbortSignal.timeout(6500)}).then(async response => {
    if (!response.ok) throw new Error("Directions unavailable");
    const {routes:[route] = []} = await response.json();
    if (!route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration) || !route.geometry?.coordinates?.length)
      return null;
    return {distance:route.distance,duration:route.duration,coordinates:route.geometry.coordinates.map(([lng,lat]) => [lat,lng])};
  }).catch(() => {
    routes.delete(key);
    return null;
  });
  if (routes.size >= 240) routes.delete(routes.keys().next().value);
  routes.set(key,request);
  return request;
}

function addMarkers(L, map, stops) {
  const locations = new Map();
  for (const stop of stops) {
    const key = locationKey(stop);
    const group = locations.get(key) || [];
    group.push(stop);
    locations.set(key,group);
  }
  for (const group of locations.values()) {
    const numbers = group.map(stop => stop.index).join(",");
    const caption = document.createElement("span");
    caption.textContent = group.map(stop => stop.index + " · " + stop.name).join(" / ");
    const icon = L.divIcon({className:"plan-map-pin",html:numbers,iconSize:null});
    L.marker(position(group[0]),{icon,title:caption.textContent,alt:caption.textContent}).addTo(map).bindTooltip(caption);
  }
}

function describeLeg(list, from, to, results) {
  const row = document.createElement("li");
  const title = document.createElement("strong");
  title.textContent = from.index + " → " + to.index + " · " + from.name + " to " + to.name;
  row.append(title);
  for (const mode of modes) {
    const route = results[mode];
    const detail = document.createElement("span");
    detail.className = "plan-route-" + mode;
    detail.textContent = modeLabel[mode] + " " + distanceLabel(route) +
      (route ? " · " + (route.duration ? Math.max(1,Math.round(route.duration/60)) : 0) + " min" : "");
    row.append(detail);
  }
  list.append(row);
}

async function mountDay(group, panel, config) {
  const L = window.L;
  const element = panel.querySelector(".plan-map");
  const stops = JSON.parse(panel.dataset.planStops);
  const pins = stops.filter(located);
  const summary = panel.querySelector(".plan-route-summary");
  let map;
  let bounds;
  const layers = {};
  if (L) {
    try {
      map = L.map(element,{scrollWheelZoom:false,zoomControl:true,minZoom:2,maxZoom:18});
      group.maps.add(map);
      bounds = L.latLngBounds(pins.map(position));
      map.fitBounds(bounds,{padding:[27,27],maxZoom:pins.length === 1 ? 14 : 15,animate:false});
      addMapboxBasemap(map,config);
      addMarkers(L,map,pins);
      for (const mode of modes) layers[mode] = L.layerGroup().addTo(map);
    } catch {
      if (map) { map.remove(); group.maps.delete(map); }
      map = null;
    }
  }
  if (!map) element.textContent = "Venue map unavailable.";
  const buttons = [...panel.querySelectorAll("[data-route-mode]")];
  for (const button of buttons) button.addEventListener("click", () => {
    const selected = button.dataset.routeMode;
    for (const choice of buttons) choice.setAttribute("aria-pressed",String(choice === button));
    if (map) for (const mode of modes) {
      if (selected === "both" || selected === mode) layers[mode].addTo(map);
      else layers[mode].remove();
    }
  });
  const timed = stops.filter(stop => stop.timed);
  if (timed.length < 2) return;
  summary.textContent = "Loading travel estimates…";
  const list = document.createElement("ol");
  list.className = "plan-route-legs";
  const note = document.createElement("p");
  note.className = "plan-map-note";
  note.textContent = "Times exclude traffic and parking." + (timed.length < stops.length ? " Routes follow shows with listed start times." : "");
  let fit = true;
  map?.once("dragstart zoomstart", () => { fit = false; });
  for (let i = 1; i < timed.length; i++) {
    if (group.disposed) return;
    const from = timed[i-1], to = timed[i];
    const pairs = await Promise.all(modes.map(async mode => [mode,await requestRoute(mode,from,to,config.mapboxToken)]));
    if (group.disposed) return;
    const results = Object.fromEntries(pairs);
    describeLeg(list,from,to,results);
    if (!map) continue;
    for (const mode of [...modes].reverse()) {
      const coordinates = results[mode]?.coordinates;
      if (!coordinates?.length) continue;
      L.polyline(coordinates,{color:routeColors[mode],weight:mode === "walking" ? 3 : 4,dashArray:mode === "walking" ? "5 7" : null,interactive:false}).addTo(layers[mode]);
      bounds.extend(L.latLngBounds(coordinates));
    }
    const coordinates = results.walking?.coordinates.length ? results.walking.coordinates : results.driving?.coordinates;
    if (!coordinates?.length) continue;
    const label = document.createElement("div");
    label.className = "plan-map-distances";
    for (const mode of modes) {
      const distance = document.createElement("span");
      distance.className = "plan-route-" + mode;
      distance.textContent = modeLabel[mode] + " " + distanceLabel(results[mode]);
      label.append(distance);
    }
    label.prepend(document.createTextNode(from.index + " → " + to.index));
    L.tooltip({permanent:true,direction:"top",offset:[0,-5],className:"plan-distance-tooltip"})
      .setLatLng(coordinates[Math.floor(coordinates.length/2)]).setContent(label).addTo(map);
  }
  if (map && fit) map.fitBounds(bounds,{padding:[36,36],maxZoom:15,animate:false});
  summary.replaceChildren(list,note);
}

export function disposePlanMaps(root) {
  const group = groups.get(root);
  if (!group) return;
  group.disposed = true;
  group.observer?.disconnect();
  for (const map of group.maps) map.remove();
  groups.delete(root);
}

export function mountPlanMaps(root, config) {
  const panels = [...root.querySelectorAll("[data-plan-stops]")].filter(panel => panel.querySelector(".plan-map"));
  if (!panels.length) return;
  const group = {maps:new Set(),observer:null,disposed:false};
  groups.set(root,group);
  const mount = panel => mountDay(group,panel,config).catch(() => {
    const summary = panel.querySelector(".plan-route-summary");
    if (!group.disposed && summary) summary.textContent = "Travel estimates unavailable.";
  });
  if (!("IntersectionObserver" in window)) { panels.forEach(mount); return; }
  group.observer = new IntersectionObserver(entries => {
    for (const {target,isIntersecting} of entries) if (isIntersecting && !group.disposed) {
      group.observer.unobserve(target);
      mount(target);
    }
  },{rootMargin:"170px"});
  panels.forEach(panel => group.observer.observe(panel));
}
