/**
 * Escapes a string for safe interpolation into HTML.
 * Use this for ANY user-controlled value that gets written into a print window
 * or otherwise interpolated into an HTML string.
 */
export const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};
