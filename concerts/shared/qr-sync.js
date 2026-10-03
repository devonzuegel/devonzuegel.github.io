export function syncLink(base, username, code) {
  const url = new URL(base);
  url.search = "";
  url.hash = new URLSearchParams({ sync: "1", username, code }).toString();
  return url.href;
}
export function parseSyncLink(hash) {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  if (p.get("sync") !== "1") return null;
  const username = p.get("username") || "",
    code = p.get("code") || "";
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,31}$/.test(username) ||
    !/^[A-Za-z0-9_-]{24}$/.test(code)
  )
    return null;
  return { username, code };
}
