// Accept anything Google's "Share map" gives the user — a regular maps URL,
// a `pb`-encoded embed URL, an `<iframe>` snippet — and return a URL that
// works inside an iframe. Returns null for empty/unrecognized input.
export function toEmbedSrc(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Pasted iframe HTML — extract the src.
  const iframeMatch = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (iframeMatch) return iframeMatch[1];

  // Already an embed URL (the `pb=...` form Google gives via Share → Embed).
  if (/^https?:\/\/(www\.)?google\.com\/maps\/embed/.test(trimmed)) return trimmed;

  // Regular Google Maps URL — append output=embed; works for /maps and /maps/place.
  if (/^https?:\/\/(www\.)?google\.com\/maps/.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      u.searchParams.set("output", "embed");
      return u.toString();
    } catch {
      return null;
    }
  }

  // maps.app.goo.gl short links — Google sets X-Frame-Options on these so
  // they won't render in an iframe. Tell the caller it's invalid.
  if (/^https?:\/\/maps\.app\.goo\.gl/.test(trimmed)) return null;

  return null;
}
