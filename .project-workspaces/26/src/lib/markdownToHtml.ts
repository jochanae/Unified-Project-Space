/**
 * Simple markdown to HTML converter for kids content
 * Handles: bold, italic, headers, lists, line breaks
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return "";

  let html = markdown
    // Escape HTML entities first
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headers (## Header -> <h2>)
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold (**text** or __text__)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    // Italic (*text* or _text_)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>")
    // Unordered lists (- item or * item)
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    // Numbered lists (1. item)
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Paragraphs (double newlines)
    .replace(/\n\n+/g, "</p><p>")
    // Single line breaks
    .replace(/\n/g, "<br>");

  // Wrap in paragraph tags
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html
    .replace(/<p><\/p>/g, "")
    .replace(/<p>(<h[1-3]>)/g, "$1")
    .replace(/(<\/h[1-3]>)<\/p>/g, "$1")
    .replace(/<p>(<ul>)/g, "$1")
    .replace(/(<\/ul>)<\/p>/g, "$1");

  return html;
}
