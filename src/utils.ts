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
