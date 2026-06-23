/**
 * Extract structured artifacts (code blocks, letters, etc.) from an
 * assistant message so they can be saved into the Artifacts Drawer.
 *
 * Plans are NOT extracted here — they're already captured by extract-plans
 * into companion_plans. The drawer will surface them by reading both tables.
 */

export type ArtifactKind = 'code' | 'plan' | 'letter' | 'document' | 'work_image' | 'other';

export interface ExtractedArtifact {
  kind: ArtifactKind;
  title: string;
  language?: string;
  content: string;
}

const CODE_FENCE = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;

const LANG_TO_EXT: Record<string, string> = {
  tsx: 'tsx', ts: 'ts', typescript: 'ts',
  jsx: 'jsx', js: 'js', javascript: 'js',
  py: 'py', python: 'py',
  sql: 'sql', json: 'json', yaml: 'yaml', yml: 'yml',
  css: 'css', html: 'html', sh: 'sh', bash: 'sh',
  md: 'md', markdown: 'md',
};

function inferTitle(language: string, body: string, _index: number): string {
  // Filename in first comment line, e.g. // src/foo.tsx or # script.py
  const firstLine = body.split('\n', 1)[0]?.trim() ?? '';
  const fileMatch = firstLine.match(/(?:\/\/|#|--|\/\*)\s*([\w./-]+\.[a-zA-Z]{1,5})/);
  if (fileMatch) return fileMatch[1];

  // Auto-title from first 60 chars of code content (collapsed whitespace).
  const collapsed = body.replace(/\s+/g, ' ').trim();
  if (collapsed.length > 0) {
    const slice = collapsed.slice(0, 60).trim();
    return collapsed.length > 60 ? `${slice}…` : slice;
  }

  const ext = LANG_TO_EXT[language.toLowerCase()] || (language || 'txt');
  return `snippet.${ext}`;
}

export function extractArtifactsFromMessage(text: string): ExtractedArtifact[] {
  const out: ExtractedArtifact[] = [];
  if (!text) return out;

  // Code blocks (must be substantial — skip tiny inline-style fences)
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = CODE_FENCE.exec(text)) !== null) {
    const language = (match[1] || '').trim();
    const body = match[2] || '';
    const trimmed = body.trim();
    // Threshold: at least 2 lines or 60 chars to count as a saveable snippet
    if (trimmed.length >= 60 || trimmed.split('\n').length >= 2) {
      out.push({
        kind: 'code',
        title: inferTitle(language, trimmed, i),
        language: language || undefined,
        content: trimmed,
      });
      i++;
    }
  }

  // Letter detection — high-signal opener + signoff (kept conservative)
  if (out.length === 0) {
    const looksLikeLetter =
      /^\s*(dear|to my|my dearest|hello [a-z]+,)/im.test(text) &&
      /(yours|love|with love|sincerely|always,)\s*[—–-]?\s*\w+/im.test(text) &&
      text.length > 200;
    if (looksLikeLetter) {
      out.push({
        kind: 'letter',
        title: 'Letter — ' + new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        content: text.trim(),
      });
    }
  }

  return out;
}
