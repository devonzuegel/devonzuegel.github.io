// Only visible thumbnails own WebGL contexts; dispose them as rows leave the viewport.
const groups = new Map();
const theme = matchMedia("(prefers-color-scheme: dark)");
export function disposeVenueMaps(root) {
  const group = groups.get(root);
  if (!group) return;
  group.observer?.disconnect();
  for (const entry of group.maps.values()) entry.map.remove();
  groups.delete(root);
}
export async function mountVenueMaps(root, config, expanded = false) {
  disposeVenueMaps(root);
  const group = { maps: new Map(), observer: null };
  groups.set(root, group);
  const { maplibreGL } = await import("../vendor/leaflet-maplibre-gl.mjs");
  if (groups.get(root) !== group || !root.isConnected) return;
  const style = () =>
    theme.matches ? config.mapStyleDark : config.mapStyleLight;
  function create(el) {
    if (group.maps.has(el)) return;
    const lat = Number(el.dataset.lat),
      lng = Number(el.dataset.lng);
    let map;
    try {
      map = L.map(el, {
        zoomControl: expanded,
        attributionControl: true,
        dragging: expanded,
        touchZoom: expanded,
        doubleClickZoom: expanded,
        scrollWheelZoom: false,
        keyboard: expanded,
        boxZoom: expanded,
        minZoom: 2,
        maxZoom: 19,
      }).setView([lat, lng], expanded ? 12 : 10);
      map.attributionControl.setPrefix(false);
      const layer = maplibreGL({
        style: style(),
        attributionControl: { customAttribution: config.mapAttribution },
      }).addTo(map);
      L.circleMarker([lat, lng], {
        radius: expanded ? 9 : 6,
        color: "#fff",
        weight: 2,
        fillColor: "#b54f30",
        fillOpacity: 1,
      }).addTo(map);
      const logo = L.control({ position: "topleft" });
      logo.onAdd = () => {
        const a = L.DomUtil.create("a", "map-provider-logo");
        a.href = "https://www.maptoolkit.org/";
        a.target = "_blank";
        a.rel = "noopener";
        a.innerHTML =
          '<img src="./vendor/maptoolkit-attribution.png" alt="Maptoolkit" width="76" height="24">';
        return a;
      };
      logo.addTo(map);
      group.maps.set(el, { map, layer });
      if (!expanded)
        map.fitBounds(
          [
            [lat, lng],
            [Number(el.dataset.cityLat), Number(el.dataset.cityLng)],
          ],
          { padding: [15, 15], maxZoom: 10 },
        );
    } catch {
      map?.remove();
      el.textContent = "Map unavailable — open location details";
    }
  }
  const els = root.querySelectorAll("[data-venue-map]");
  if (expanded) {
    els.forEach(create);
    return;
  }
  group.observer = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) create(target);
      else {
        group.maps.get(target)?.map.remove();
        group.maps.delete(target);
      }
    }
  });
  els.forEach((el) => group.observer.observe(el));
}
theme.addEventListener("change", () => {
  const config = window.CONCERTS_CONFIG;
  for (const group of groups.values())
    for (const { layer } of group.maps.values())
      layer
        .getMaplibreMap()
        .setStyle(theme.matches ? config.mapStyleDark : config.mapStyleLight);
});
