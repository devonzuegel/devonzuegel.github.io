import { mkdir, copyFile, readdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
await mkdir(new URL("vendor/images/", root), { recursive: true });
for (const [from, to] of [
  ["maplibre-gl/dist/maplibre-gl.mjs", "maplibre-gl.mjs"],
  ["maplibre-gl/dist/maplibre-gl-shared.mjs", "maplibre-gl-shared.mjs"],
  ["maplibre-gl/dist/maplibre-gl-worker.mjs", "maplibre-gl-worker.mjs"],
  ["maplibre-gl/dist/maplibre-gl.css", "maplibre-gl.css"],
  ["maplibre-gl/LICENSE.txt", "MAPLIBRE-LICENSE"],
  [
    "@maplibre/maplibre-gl-leaflet/dist/leaflet-maplibre-gl.mjs",
    "leaflet-maplibre-gl.mjs",
  ],
  ["@maplibre/maplibre-gl-leaflet/LICENSE", "MAPLIBRE-LEAFLET-LICENSE"],
  ["leaflet/dist/leaflet.js", "leaflet.js"],
  ["leaflet/dist/leaflet.css", "leaflet.css"],
  [
    "leaflet.markercluster/dist/leaflet.markercluster.js",
    "leaflet.markercluster.js",
  ],
  ["leaflet.markercluster/dist/MarkerCluster.css", "MarkerCluster.css"],
  [
    "leaflet.markercluster/dist/MarkerCluster.Default.css",
    "MarkerCluster.Default.css",
  ],
  ["leaflet/LICENSE", "LEAFLET-LICENSE"],
  ["leaflet.markercluster/MIT-LICENCE.txt", "MARKERCLUSTER-LICENSE"],
])
  await copyFile(
    new URL(`node_modules/${from}`, root),
    new URL(`vendor/${to}`, root),
  );
for (const file of await readdir(
  new URL("node_modules/leaflet/dist/images/", root),
)) {
  await copyFile(
    new URL(`node_modules/leaflet/dist/images/${file}`, root),
    new URL(`vendor/images/${file}`, root),
  );
}
