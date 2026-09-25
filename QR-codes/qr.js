import encodeQR from "./vendor/qr.js";
export function matrix(url) {
  return encodeQR(url, "raw", { ecc: "quartile", border: 4, scale: 1 });
}
export function svg(url) {
  const grid = matrix(url),
    size = grid.length;
  const path = grid
    .flatMap((row, y) =>
      row.flatMap((black, x) => (black ? [`M${x} ${y}h1v1h-1z`] : [])),
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 32}" height="${size * 32}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${path}" fill="black"/></svg>`;
}
export async function png(url) {
  const grid = matrix(url),
    scale = Math.ceil(1600 / grid.length),
    canvas = document.createElement("canvas");
  canvas.width = canvas.height = grid.length * scale;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  grid.forEach((row, y) =>
    row.forEach((black, x) => {
      if (black) ctx.fillRect(x * scale, y * scale, scale, scale);
    }),
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("PNG export failed.")),
      "image/png",
    ),
  );
}
export function filename(name) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || "QR-code"
  );
}
export async function download(code, format) {
  const blob =
    format === "png"
      ? await png(code.tracking_url)
      : new Blob([svg(code.tracking_url)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `${filename(code.name)}.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
