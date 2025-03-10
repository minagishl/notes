export function codePoint(emoji: string): string {
  // Convert pictograms to Unicode code points
  const codePoints = Array.from(emoji)
    .map((char) => {
      const codePoint = char.codePointAt(0);
      return codePoint !== undefined ? codePoint.toString(16) : "";
    })
    .join("-");

  // Remove part after the first hyphen
  const cleanedCodePoints = codePoints.split("-")[0];

  return cleanedCodePoints;
}

export function emojiToTwemojiUrl(emoji: string): string {
  const baseUrl = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/15.1.0/svg/";

  // Returns the completed URL
  return `${baseUrl}${codePoint(emoji)}.svg`;
}
