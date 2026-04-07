/**
 * Resolve a root-absolute path (e.g. `/data/x.json`) for fetch() in the browser.
 * With `file://` and a static export under an `out/` folder, absolute `/data` is wrong;
 * use a path relative to the current HTML file instead. For normal http(s) hosting
 * with the server root at `out/`, keep `/...`.
 */
export function publicAssetUrl(absolutePath: string): string {
  const p = absolutePath.startsWith("/") ? absolutePath.slice(1) : absolutePath;
  if (typeof window === "undefined") return `/${p}`;
  if (window.location.protocol !== "file:") return `/${p}`;

  const norm = decodeURI(window.location.pathname.replace(/\\/g, "/"));
  const parts = norm.split("/").filter(Boolean);
  const outI = parts.lastIndexOf("out");
  if (outI < 0) return `./${p}`;
  const depth = Math.max(0, parts.length - outI - 2);
  const prefix = depth === 0 ? "./" : "../".repeat(depth);
  return `${prefix}${p}`;
}
