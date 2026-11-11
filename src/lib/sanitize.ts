import DOMPurify from "dompurify";

/** Strips every HTML tag/attribute and trims. Call only in the browser (event handlers). */
export function cleanText(value: string, maxLength = 1000): string {
  const stripped = DOMPurify.isSupported
    ? DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    : value.replace(/<[^>]*>/g, "");
  return stripped.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/** Like cleanText but keeps line breaks (addresses, notes). */
export function cleanMultiline(value: string, maxLength = 1000): string {
  return value
    .split("\n")
    .map((line) => cleanText(line, maxLength))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}
