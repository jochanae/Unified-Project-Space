const SKETCH_TOOL_TOKEN = /\[(SKETCH|IMAGE_GEN)\s*:\s*([\s\S]+?)\]\s*$/i;
const STREAMING_SKETCH_TOOL_TOKEN = /\s*\[(?:SKETCH|IMAGE_GEN)\s*:[\s\S]*$/i;
const SKETCH_CONSENT_TOKEN = /\[SKETCH_CONSENT:\s*([^\]]+)\]\s*$/i;

export interface SketchToolCallExtraction {
  cleanText: string;
  prompt?: string;
  source?: 'SKETCH' | 'IMAGE_GEN';
}

export function stripSketchToolCallForDisplay(text: string): string {
  return text.replace(STREAMING_SKETCH_TOOL_TOKEN, '').trimEnd();
}

export function extractSketchToolCall(text: string): SketchToolCallExtraction {
  const match = text.match(SKETCH_TOOL_TOKEN);
  if (!match) return { cleanText: text };

  return {
    cleanText: text.replace(SKETCH_TOOL_TOKEN, '').trim(),
    prompt: match[2].trim(),
    source: match[1].toUpperCase() as 'SKETCH' | 'IMAGE_GEN',
  };
}

export function encodeSketchConsentFallback(prompt: string): string {
  return `[SKETCH_CONSENT:${encodeURIComponent(prompt.trim().slice(0, 1800))}]`;
}

export function decodeSketchConsentFallback(text: string): { cleanText: string; prompt?: string } {
  const match = text.match(SKETCH_CONSENT_TOKEN);
  if (!match) return { cleanText: text };
  let prompt = match[1];
  try { prompt = decodeURIComponent(prompt); } catch { /* keep raw */ }
  return {
    cleanText: text.replace(SKETCH_CONSENT_TOKEN, '').trim(),
    prompt: prompt.trim(),
  };
}