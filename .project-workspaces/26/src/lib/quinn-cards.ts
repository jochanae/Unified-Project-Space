import type { QuinnCardData } from "@/components/quinn-cards/QuinnCard";

export interface ParsedCardSegment {
  type: "text" | "card";
  text?: string;
  card?: QuinnCardData;
}

function findJsonObjectEnd(value: string, startIndex: number) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < value.length; i++) {
    const char = value[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function normalizeCardPayload(parsed: any): QuinnCardData | null {
  if (!parsed || typeof parsed.title !== "string" || !Array.isArray(parsed.sections)) {
    return null;
  }

  return {
    card_type: parsed.card_type,
    title: parsed.title,
    callout: parsed.callout,
    sections: parsed.sections.map((s: any) => ({
      heading: String(s.heading ?? ""),
      body: String(s.body ?? ""),
      bullets: Array.isArray(s.bullets) ? s.bullets.map(String) : undefined,
    })),
    metadata: parsed.metadata && typeof parsed.metadata === "object" ? parsed.metadata : undefined,
  };
}

/**
 * Parse Bloom's assistant message for :::card ... ::: JSON blocks.
 * Splits content into ordered text + card segments for inline rendering.
 *
 * Expected format:
 * :::card
 * { "card_type": "blueprint_proposal", "title": "...", "callout": "...",
 *   "sections": [{ "heading": "...", "body": "...", "bullets": ["..."] }] }
 * :::
 */
export function parseCardSegments(content: string): ParsedCardSegment[] {
  if (!content) return [];

  const segments: ParsedCardSegment[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    const markerIndex = content.indexOf(":::card", cursor);
    if (markerIndex === -1) break;

    const before = content.slice(cursor, markerIndex).trim();
    if (before) segments.push({ type: "text", text: before });

    const jsonStart = content.indexOf("{", markerIndex + ":::card".length);
    if (jsonStart === -1) {
      cursor = content.length;
      break;
    }

    const jsonEnd = findJsonObjectEnd(content, jsonStart);
    if (jsonEnd === -1) {
      cursor = content.length;
      break;
    }

    const jsonRaw = content.slice(jsonStart, jsonEnd + 1).trim();
    try {
      const parsed = JSON.parse(jsonRaw);
      const card = normalizeCardPayload(parsed);
      if (card) {
        segments.push({ type: "card", card });
      } else {
        segments.push({ type: "text", text: "" });
      }
    } catch {
      segments.push({ type: "text", text: "" });
    }

    const closingIndex = content.indexOf(":::", jsonEnd + 1);
    cursor = closingIndex === -1 ? jsonEnd + 1 : closingIndex + 3;
  }

  const tail = content.slice(cursor).trim();
  if (tail) segments.push({ type: "text", text: tail });

  if (segments.length === 0) {
    segments.push({ type: "text", text: content });
  }
  return segments;
}
