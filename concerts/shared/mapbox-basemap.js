const theme = matchMedia("(prefers-color-scheme: dark)");

export function addMapboxBasemap(map, config, thumbnail = false) {
  const token = config.mapboxToken;
  if (!token?.startsWith("pk.")) throw new Error("Mapbox public token missing");
  const style = () =>
    theme.matches ? config.mapStyleDark : config.mapStyleLight;
  const attribution =
    '<a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener">© Mapbox</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> <a href="https://apps.mapbox.com/feedback/" target="_blank" rel="noopener">Improve this map</a>';
  const url = () => {
    const base = `https://api.mapbox.com/styles/v1/${style()}`;
    if (!thumbnail)
      return `${base}/tiles/512/{z}/{x}/{y}@2x?access_token=${encodeURIComponent(token)}`;
    const center = map.getCenter(),
      size = map.getSize();
    // Mapbox uses a 512px world tile; Leaflet uses 256px.
    return `${base}/static/${center.lng},${center.lat},${map.getZoom() - 1}/${Math.round(size.x)}x${Math.round(size.y)}@2x?access_token=${encodeURIComponent(token)}&attribution=false&logo=false`;
  };
  map.attributionControl.setPrefix(false);
  // Keep the required text attribution visible on static thumbnails.
  if (thumbnail) map.attributionControl.setPosition("topright");
  const layer = thumbnail
    ? L.imageOverlay(url(), map.getBounds(), { attribution })
    : L.tileLayer(url(), {
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 19,
        attribution,
      });
  layer.addTo(map);
  if (!thumbnail) {
    const logo = L.control({ position: "bottomleft" });
    logo.onAdd = () => {
      const link = L.DomUtil.create("a", "mapbox-provider-logo");
      link.href = "https://www.mapbox.com/";
      link.target = "_blank";
      link.rel = "noopener";
      link.innerHTML =
        '<img src="./vendor/mapbox-logo.svg" alt="Mapbox" width="88" height="23">';
      L.DomEvent.disableClickPropagation(link);
      return link;
    };
    logo.addTo(map);
  }
  const onTheme = () => layer.setUrl(url());
  theme.addEventListener("change", onTheme);
  map.once("unload", () => theme.removeEventListener("change", onTheme));
  return layer;
}
