export const USER_AGENT =
  "EncoreConcerts/1.0 (+https://devonzuegel.com/concerts/)";
export async function request(url, options = {}) {
  const r = await fetch(url, {
    ...options,
    headers: { "User-Agent": USER_AGENT, ...options.headers },
    signal: options.signal || AbortSignal.timeout(18000),
  });
  if (!r.ok)
    throw Object.assign(
      new Error(
        r.status === 429
          ? "Source rate limit reached."
          : `Source returned HTTP ${r.status}.`,
      ),
      { status: r.status },
    );
  return r;
}
export const json = async (url, options) =>
  (await request(url, options)).json();

export async function responseText(response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const head = new TextDecoder("ascii").decode(bytes.slice(0, 4096));
  const charset =
    response.headers
      .get("content-type")
      ?.match(/charset=[\"']?([^;\"'\s]+)/i)?.[1] ||
    head.match(/charset=[\"']?([^;\"'\s>]+)/i)?.[1] ||
    "utf-8";
  return new TextDecoder(charset).decode(bytes);
}
