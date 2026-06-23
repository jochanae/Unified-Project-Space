/**
 * LivePreview — sandboxed iframe that renders TSX/JSX/HTML/CSS snippets.
 *
 * Strategy:
 *  - HTML/CSS → injected directly.
 *  - TSX/JSX/JS → we rewrite `export default` to `window.__LP_COMPONENT =`,
 *    strip named `export`s, then Babel-standalone transpiles. esm.sh +
 *    importmap resolves bare imports from a strict allowlist.
 *  - All execution happens inside `<iframe sandbox="allow-scripts">` so it
 *    cannot touch parent storage, cookies, or the Supabase session.
 */
import { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Code as CodeIcon, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import CodeViewer from './CodeViewer';

interface LivePreviewProps {
  code: string;
  language?: string;
  className?: string;
}

const TAILWIND_CDN = 'https://cdn.tailwindcss.com';
const ESM_SH = 'https://esm.sh';

// Strict allowlist: bare imports outside this set are blocked at preview time.
const DEPENDENCY_ALLOWLIST: Record<string, string> = {
  react: `${ESM_SH}/react@18.3.1`,
  'react/jsx-runtime': `${ESM_SH}/react@18.3.1/jsx-runtime`,
  'react-dom': `${ESM_SH}/react-dom@18.3.1`,
  'react-dom/client': `${ESM_SH}/react-dom@18.3.1/client`,
  'lucide-react': `${ESM_SH}/lucide-react@0.462.0?external=react`,
  clsx: `${ESM_SH}/clsx@2.1.1`,
  'class-variance-authority': `${ESM_SH}/class-variance-authority@0.7.1?external=clsx`,
  'tailwind-merge': `${ESM_SH}/tailwind-merge@2.5.5`,
  'framer-motion': `${ESM_SH}/framer-motion@11.11.1?external=react`,
  'react-router-dom': `${ESM_SH}/react-router-dom@6.27.0?external=react,react-dom`,
  'react-router': `${ESM_SH}/react-router@6.27.0?external=react`,
};

const BARE_IMPORT = /(?:^|\n)\s*import\s+(?:[^'"]+\sfrom\s+)?['"]([^'".][^'"]*)['"]/g;

function findDisallowedImports(src: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = BARE_IMPORT.exec(src)) !== null) {
    const spec = m[1];
    // Allow relative + http urls (rewriting handles bare specifiers only)
    if (spec.startsWith('.') || spec.startsWith('http')) continue;
    // Match either exact or root package (lucide-react/icons → lucide-react)
    const root = spec.split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/');
    if (!DEPENDENCY_ALLOWLIST[spec] && !DEPENDENCY_ALLOWLIST[root]) out.add(spec);
  }
  return Array.from(out);
}

/**
 * Transform user code so we can grab the component on `window`.
 *  - `export default function Foo()` → `function Foo() {...}; window.__LP_COMPONENT = Foo;`
 *  - `export default Foo` → `window.__LP_COMPONENT = Foo;`
 *  - `export default <expr>` → `window.__LP_COMPONENT = <expr>;`
 *  - `export const X` / `export function X` → strip the `export ` keyword
 */
export function rewriteExports(src: string): string {
  let out = src;
  out = out.replace(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g, 'function $1(');
  out = out.replace(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?/g, 'window.__LP_COMPONENT = $1;');
  out = out.replace(/export\s+default\s+/g, 'window.__LP_COMPONENT = ');
  out = out.replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ');
  if (!/__LP_COMPONENT\s*=/.test(out)) {
    const names = Array.from(out.matchAll(/function\s+([A-Z][\w$]*)\s*\(/g)).map(m => m[1]);
    if (names.length) out += `\nwindow.__LP_COMPONENT = ${names[names.length - 1]};`;
  }
  return out;
}

function buildHtmlDoc(code: string, lang: string): string {
  const isHtml = lang === 'html';
  const isCss = lang === 'css';

  if (isHtml) {
    if (/<html[\s>]/i.test(code)) return code;
    return `<!doctype html><html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="${TAILWIND_CDN}"></script>
<style>html,body{margin:0;background:#0a0a0a;color:#fff;font-family:ui-sans-serif,system-ui,sans-serif;}</style>
</head><body>${code}</body></html>`;
  }

  if (isCss) {
    return `<!doctype html><html><head><meta charset="utf-8" />
<style>${code}</style>
<style>html,body{margin:0;background:#0a0a0a;color:#fff;font-family:ui-sans-serif,system-ui,sans-serif;padding:1rem;}</style>
</head><body><div class="preview-root">CSS applied — add HTML to see result.</div></body></html>`;
  }

  const importMap = { imports: DEPENDENCY_ALLOWLIST };
  const rewritten = rewriteExports(code).replace(/<\/script>/gi, '<\\/script>');

  return `<!doctype html><html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="${TAILWIND_CDN}"></script>
<script src="https://unpkg.com/@babel/standalone@7.25.6/babel.min.js"></script>
<script type="importmap">${JSON.stringify(importMap)}</script>
<style>
  html,body{margin:0;background:#0a0a0a;color:#fff;font-family:ui-sans-serif,system-ui,sans-serif;}
  #root{min-height:100vh;}
  .lp-error{position:fixed;left:0;right:0;bottom:0;max-height:55vh;overflow:auto;padding:14px 16px;background:rgba(40,8,8,0.96);border-top:1px solid rgba(255,90,90,0.4);color:#ffb4b4;font-family:ui-monospace,SFMono-Regular,monospace;font-size:11.5px;line-height:1.55;white-space:pre-wrap;z-index:99999;}
  .lp-error b{display:block;color:#ff8585;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;font-size:10.5px;margin-bottom:6px;}
</style>
</head><body>
<div id="root"><div style="padding:16px;color:#666;font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px">Loading preview…</div></div>
<script type="module">
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  window.React = React;
  window.__LP_createRoot = createRoot;
</script>
<script type="text/babel" data-presets="typescript,react" data-type="module">
${rewritten}
</script>
<script>
  function showError(title, msg) {
    var existing = document.querySelector('.lp-error');
    if (existing) existing.remove();
    var div = document.createElement('div');
    div.className = 'lp-error';
    div.innerHTML = '<b>' + title + '</b>' + String(msg || '').replace(/[<>&]/g, function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c];});
    document.body.appendChild(div);
  }
  window.addEventListener('error', function(e){
    var msg = e.error && e.error.stack ? e.error.stack : (e.message || 'Unknown error');
    showError('Runtime error', msg);
  });
  window.addEventListener('unhandledrejection', function(e){
    showError('Unhandled promise', e.reason && e.reason.stack ? e.reason.stack : String(e.reason));
  });
  function tryMount(attempt) {
    attempt = attempt || 0;
    if (window.__LP_COMPONENT && window.__LP_createRoot && window.React) {
      try {
        var root = window.__LP_createRoot(document.getElementById('root'));
        root.render(window.React.createElement(window.__LP_COMPONENT));
      } catch (err) { showError('Render error', err.stack || err.message); }
      return;
    }
    if (attempt > 80) {
      showError('No component found', 'Make sure your snippet has \`export default function ...\` or defines a PascalCase component.');
      return;
    }
    setTimeout(function(){ tryMount(attempt + 1); }, 50);
  }
  setTimeout(function(){ tryMount(0); }, 100);
</script>
</body></html>`;
}

export default function LivePreview({ code, language, className }: LivePreviewProps) {
  const lang = (language || 'tsx').toLowerCase();
  const supported = ['tsx', 'jsx', 'ts', 'typescript', 'js', 'javascript', 'html', 'css'].includes(lang);
  const [reloadKey, setReloadKey] = useState(0);
  const [showRewrite, setShowRewrite] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isJsLike = !['html', 'css'].includes(lang);
  const disallowed = useMemo(
    () => (isJsLike && supported ? findDisallowedImports(code) : []),
    [code, isJsLike, supported],
  );

  const rewritten = useMemo(
    () => (isJsLike && supported ? rewriteExports(code) : code),
    [code, isJsLike, supported],
  );

  const srcDoc = useMemo(() => {
    if (!supported) return '';
    const normalized = ['html', 'css'].includes(lang) ? lang : 'tsx';
    return buildHtmlDoc(code, normalized);
  }, [code, lang, supported]);

  // Auto-rerender when code changes
  useEffect(() => { setReloadKey(k => k + 1); }, [code]);

  // ESC closes fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [fullscreen]);

  if (!supported) {
    return (
      <div className={cn('flex items-center justify-center rounded-lg border border-white/5 bg-black/40 p-6 text-xs text-muted-foreground/60', className)}>
        Live preview isn't available for <span className="ml-1 font-mono text-foreground/70">{lang}</span>.
      </div>
    );
  }

  const body = (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-white/10 bg-[#0a0a0a] overflow-hidden',
        fullscreen && 'fixed inset-0 z-[300] rounded-none border-0 h-[100dvh] w-screen',
        !fullscreen && className,
      )}
      style={fullscreen ? { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}
    >
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-white/[0.06] bg-black/40">
        <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground/60">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(45_70%_60%)]" />
          Live preview
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowRewrite(s => !s)}
            className={cn(
              'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] tracking-wide transition-colors',
              showRewrite ? 'bg-[hsl(45_60%_52%/0.15)] text-[hsl(45_70%_70%)]' : 'text-muted-foreground/70 hover:text-foreground',
            )}
            title="Toggle compiled source"
          >
            <CodeIcon className="h-3 w-3" />
            Source
          </button>
          <button
            onClick={() => setReloadKey(k => k + 1)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] tracking-wide text-muted-foreground/70 hover:text-foreground"
            title="Re-run preview"
          >
            <RefreshCw className="h-3 w-3" />
            Rerender
          </button>
          <button
            onClick={() => setFullscreen(f => !f)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] tracking-wide text-muted-foreground/70 hover:text-foreground"
            title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {fullscreen ? 'Exit' : 'Full'}
          </button>
        </div>
      </div>

      {disallowed.length > 0 && (
        <div className="flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-1.5 text-[11px] text-amber-200/90">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            Blocked imports (not in allowlist):{' '}
            <span className="font-mono">{disallowed.join(', ')}</span>
          </span>
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        <iframe
          ref={iframeRef}
          key={reloadKey}
          title="Live preview"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          className="w-full h-full min-h-[14rem] bg-[#0a0a0a]"
        />
      </div>

      {showRewrite && isJsLike && (
        <div className="border-t border-white/[0.06] max-h-48 overflow-auto">
          <CodeViewer code={rewritten} language="tsx" wrap={false} showLineNumbers className="max-h-48" />
        </div>
      )}
    </div>
  );

  // Portal to document.body when fullscreen — escapes Vaul drawer's transform
  // (which creates a stacking context that traps position:fixed).
  return fullscreen && typeof document !== 'undefined'
    ? createPortal(body, document.body)
    : body;
}
