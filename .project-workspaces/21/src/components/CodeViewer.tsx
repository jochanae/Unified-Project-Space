/**
 * CodeViewer — syntax-highlighted code rendering using Shiki.
 * Lazily loads Shiki only when first code artifact is opened.
 */
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const LANG_MAP: Record<string, string> = {
  tsx: 'tsx', ts: 'typescript', typescript: 'typescript',
  jsx: 'jsx', js: 'javascript', javascript: 'javascript',
  py: 'python', python: 'python',
  sql: 'sql', json: 'json', yaml: 'yaml', yml: 'yaml',
  css: 'css', html: 'html', sh: 'bash', bash: 'bash',
  md: 'markdown', markdown: 'markdown',
};

let highlighterPromise: Promise<any> | null = null;
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(({ createHighlighter }) =>
      createHighlighter({
        themes: ['github-dark-default'],
        langs: ['tsx', 'typescript', 'jsx', 'javascript', 'python', 'sql', 'json', 'yaml', 'css', 'html', 'bash', 'markdown'],
      })
    );
  }
  return highlighterPromise;
}

interface CodeViewerProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  wrap?: boolean;
  className?: string;
}

export default function CodeViewer({ code, language, showLineNumbers = true, wrap = true, className }: CodeViewerProps) {
  const [html, setHtml] = useState<string | null>(null);
  const lang = LANG_MAP[(language || '').toLowerCase()] || 'tsx';

  useEffect(() => {
    let alive = true;
    getHighlighter()
      .then(h => {
        if (!alive) return;
        try {
          const out = h.codeToHtml(code, { lang, theme: 'github-dark-default' });
          setHtml(out);
        } catch {
          // Unknown lang fallback
          const out = h.codeToHtml(code, { lang: 'tsx', theme: 'github-dark-default' });
          setHtml(out);
        }
      })
      .catch(() => setHtml(null));
    return () => { alive = false; };
  }, [code, lang]);

  return (
    <div
      className={cn(
        'code-viewer relative rounded-lg bg-[#0d1117] text-[11px] leading-relaxed overflow-auto',
        showLineNumbers && 'code-viewer--numbered',
        wrap ? 'code-viewer--wrap' : 'code-viewer--nowrap',
        className,
      )}
    >
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="p-3 text-foreground/80"><code>{code}</code></pre>
      )}
    </div>
  );
}
