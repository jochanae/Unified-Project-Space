/**
 * SanctuaryGate
 * The premium auth wall for all gated routes (Notes, Finances, Workspace).
 * Reader stays public — every other personal feature uses this gate.
 */

import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpen } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

interface SanctuaryGateProps {
  icon?: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  redirectTo: string;
  features?: string[];
  showReaderLink?: boolean;
  /**
   * When true, renders a minimal marketing-style header (wordmark + Home link)
   * instead of the authenticated AppShell chrome. Used for admin/private gates
   * where the centered MasterHeader medallion feels out of place.
   */
  simpleHeader?: boolean;
}

function SimpleHeader() {
  return (
    <header className="hairline-b bg-obsidian/85 backdrop-blur-md rounded-b-2xl overflow-hidden">
      <div
        className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/sanctum-seal.svg"
            alt=""
            aria-hidden="true"
            className="h-6 w-6 opacity-90"
            style={{ filter: "drop-shadow(0 0 4px rgba(201,168,76,0.25))" }}
          />
          <span className="font-display text-2xl tracking-wide text-gold-soft">
            Sanctum<span className="text-gold">IQ</span>
          </span>
        </Link>
        <Link
          to="/"
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold-soft transition-colors"
        >
          ← Home
        </Link>
      </div>
    </header>
  );
}

export function SanctuaryGate({
  icon: Icon = BookOpen,
  eyebrow,
  title,
  description,
  redirectTo,
  features = [],
  showReaderLink = false,
  simpleHeader = false,
}: SanctuaryGateProps) {
  const body = (
    <div className="flex min-h-[80svh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        {/* Icon halo */}
        <div
          className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/25"
          style={{ background: "oklch(0.74 0.115 85 / 0.08)" }}
        >
          <Icon className="h-7 w-7 text-gold" strokeWidth={1.5} />
        </div>

        <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-4">{eyebrow}</p>

        <h1 className="font-display text-4xl md:text-5xl text-foreground leading-[1.1] mb-4">
          {title}
        </h1>

        <p className="text-muted-foreground text-base leading-relaxed mb-8 max-w-sm mx-auto">
          {description}
        </p>

        {features.length > 0 && (
          <ul className="mb-8 space-y-2 text-left mx-auto max-w-xs">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-muted-foreground/80">
                <span aria-hidden className="h-1 w-1 rounded-full bg-gold/60 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        )}

        <Link
          to="/auth"
          search={{ redirect: redirectTo, mode: "signin" }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-medium text-obsidian hover:bg-gold-soft transition-colors mb-3"
        >
          Enter your sanctuary
          <ArrowRight className="h-4 w-4" />
        </Link>

        <Link
          to="/auth"
          search={{ redirect: redirectTo, mode: "signup" }}
          className="inline-flex w-full items-center justify-center rounded-md border border-gold/30 px-6 py-3 text-sm text-gold-soft hover:bg-gold/10 transition-colors"
        >
          Create a free account
        </Link>

        {showReaderLink && (
          <div className="mt-6 rounded-md border border-gold/20 bg-gold/8 p-4">
            <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-gold/80">
              Public Reader
            </p>
            <Link
              to="/reader"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gold/30 bg-transparent px-6 py-3 text-sm text-gold-soft transition-colors hover:bg-gold/10"
            >
              Enter Public Reader
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  if (simpleHeader) {
    return (
      <div className="min-h-screen bg-obsidian text-foreground">
        <SimpleHeader />
        {body}
      </div>
    );
  }

  return <AppShell>{body}</AppShell>;
}
