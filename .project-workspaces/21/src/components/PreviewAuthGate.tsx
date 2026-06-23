import { useEffect, useState } from 'react';

/**
 * PreviewAuthGate
 *
 * Lovable's preview environment returns HTTP 412 (Precondition Failed) when
 * the iframe session needs to re-authenticate. Without a visible signal, the
 * app appears to silently fail (blank cards, missing data, stuck spinners).
 *
 * This component installs a global `fetch` interceptor. On any 412 it raises
 * a full-screen overlay with a clear call-to-action so the user (or the AI's
 * browser smoke-test) can sign back in and continue verifying the UI.
 */
export default function PreviewAuthGate() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 412) {
        setBlocked(true);
      }
      return res;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (!blocked) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="preview-auth-title"
      className="fixed inset-0 z-[300] flex items-center justify-center bg-background/85 backdrop-blur-md p-6"
    >
      <div className="max-w-sm w-full rounded-2xl border border-white/10 bg-card/90 p-6 text-center shadow-2xl">
        <div className="mb-3 text-3xl">🔒</div>
        <h2 id="preview-auth-title" className="text-base font-semibold text-foreground mb-2">
          Sign in to continue
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          The preview session expired (HTTP 412). Sign back in to keep verifying the UI.
        </p>
        <div className="flex gap-2">
          <a
            href="/auth"
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign In
          </a>
          <button
            onClick={() => setBlocked(false)}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
