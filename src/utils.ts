import { parse } from "twemoji-parser";

export function codePoint(emoji: string): string {
  const emojiUrl = parse(emoji, { assetType: "svg" });

  if (!emojiUrl[0]) return "";
  const codePoints = emojiUrl[0].url.split("/").slice(-1)[0].split(".")[0];

  // Returns the completed URL
  return codePoints;
}

export function emojiToTwemojiUrl(emoji: string): string {
  const baseUrl = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/15.1.0/svg/";

  // Returns the completed URL
  return baseUrl + codePoint(emoji) + ".svg";
}

export function normalizePathname(pathname: string): string {
  if (!pathname) return "/";

  const ensureLeadingSlash = (value: string) =>
    value.startsWith("/") ? value : `/${value}`;

  const input = ensureLeadingSlash(pathname === "/" ? "/" : pathname);

  if (input === "/index.html") {
    return "/";
  }

  if (input.endsWith("/index.html")) {
    const trimmed = input.slice(0, -"/index.html".length);
    return trimmed === "" ? "/" : trimmed;
  }

  if (input.endsWith(".html")) {
    const trimmed = input.slice(0, -".html".length);
    return trimmed === "" ? "/" : ensureLeadingSlash(trimmed);
  }

  return input;
}

export function buildCanonicalUrl(url: URL, site?: string | URL): string {
  const baseInput = site
    ? typeof site === "string"
      ? site
      : site.href
    : url.origin;
  const base = new URL(baseInput);
  const pathname = normalizePathname(url.pathname);
  const canonical = new URL(pathname + url.search, base);
  canonical.hash = "";
  return canonical.href;
}
