/**
 * /workspace/sermons/choice
 *
 * The Architect's Entrance — replaces /workspace/sermons/new.
 *
 * Two paths:
 *   Co-Author  — opens CoAuthorConfigurator inline, creates sermon row with
 *                full metadata, navigates to editor with AI generation queued
 *   Masterpiece — creates blank sermon row immediately, navigates to editor
 *
 * Accepts search params for the Bible bridge:
 *   ?scripture=Romans+8:28&scriptureText=...&path=coauthor
 */

import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BookOpen, PenLine, ScrollText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { WorkspaceSkeleton } from "@/components/ui/page-skeletons";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { CoAuthorConfigurator } from "@/components/workspace/CoAuthorConfigurator";
import { cn } from "@/lib/utils";

/* ─── Route ─────────────────────────────────────────────────────────────── */

export const Route = createFileRoute("/workspace/sermons/choice")({
  validateSearch: (search: Record<string, unknown>) => ({
    scripture: typeof search.scripture === "string" ? search.scripture : undefined,
    scriptureText: typeof search.scriptureText === "string" ? search.scriptureText : undefined,
    path: search.path === "coauthor" ? ("coauthor" as const) : undefined,
  }),
  head: () => ({
    meta: [{ title: "Begin Manuscript — SanctumIQ" }, { name: "robots", content: "noindex" }],
  }),
  component: ChoicePage,
});

type ActiveView = "choice" | "coauthor";

function ChoicePage() {
  const { user, loading: authLoading } = useAuth();
  const { hasAnyRole, loading: rolesLoading } = useRoles(user?.id);
  const canUse = hasAnyRole(["minister", "church_partner", "admin"]);
  const navigate = useNavigate();
  const { scripture, scriptureText, path } = useSearch({ from: "/workspace/sermons/choice" });

  /* If Bible bridge passed ?path=coauthor, open configurator immediately */
  const [view, setView] = useState<ActiveView>(path === "coauthor" ? "coauthor" : "choice");

  /* Masterpiece — create blank sermon and navigate to editor */
  const [creating, setCreating] = useState(false);
  const startedRef = useRef(false);

  const handleMasterpiece = async () => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("sermons")
        .insert({
          user_id: user.id,
          title: "Untitled sermon",
          status: "draft",
          current_version: 1,
          length_target: "standard",
        })
        .select("id")
        .single();

      if (error || !data) {
        toast.error("Could not create sermon. Please try again.");
        setCreating(false);
        return;
      }

      navigate({
        to: "/workspace/sermons/$sermonId",
        params: { sermonId: data.id },
        replace: true,
      });
    } catch {
      toast.error("Something went wrong. Please try again.");
      setCreating(false);
    }
  };

  /* CoAuthor complete — navigate to editor */
  const handleCoAuthorComplete = (sermonId: string) => {
    navigate({
      to: "/workspace/sermons/$sermonId",
      params: { sermonId },
      replace: true,
    });
  };

  /* ── Guards ───────────────────────────────────────────────────────────── */
  if (authLoading || rolesLoading) {
    return (
      <LoadingAppShell pageTitle="Begin Manuscript">
        <WorkspaceSkeleton text="Preparing your workspace…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Sermon Composer"
        title="Where preparation meets purpose"
        description="Sign in to begin your manuscript."
        redirectTo="/workspace/sermons/choice"
      />
    );
  }

  if (!canUse) {
    return (
      <SanctuaryGate
        eyebrow="Sermon Composer"
        title="Reserved for ministers and church partners"
        description="Upgrade to access the full Sermon Composer and ministry workspace."
        redirectTo="/pricing"
      />
    );
  }

  /* ── Co-Author view ───────────────────────────────────────────────────── */
  if (view === "coauthor") {
    return (
      <AppShell pageTitle="Co-Author">
        <div className="mx-auto max-w-lg px-5 py-10 space-y-8">
          {/* Ambient glow */}
          <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-32 -right-32 h-[360px] w-[360px] rounded-full bg-gold/6 blur-[100px]" />
            <div className="absolute bottom-0 -left-24 h-[280px] w-[280px] rounded-full bg-gold/4 blur-[100px]" />
          </div>

          {/* Header */}
          <header className="text-center space-y-2">
            <p className="text-[10px] uppercase tracking-[0.32em] text-gold/70">Co-Author</p>
            <h1 className="font-display text-2xl text-foreground">Architect your message</h1>
            <p className="text-sm text-muted-foreground/70 leading-relaxed">
              Shape your blueprint. Selah helps you prepare before you build.
            </p>
          </header>

          {/* Configurator */}
          <CoAuthorConfigurator
            prefilledScripture={scripture ?? ""}
            prefilledScriptureText={scriptureText ?? ""}
            onComplete={handleCoAuthorComplete}
            onCancel={() => setView("choice")}
          />
        </div>
      </AppShell>
    );
  }

  /* ── Choice view (default) ────────────────────────────────────────────── */
  return (
    <AppShell pageTitle="Begin Manuscript">
      <div className="mx-auto max-w-lg px-5 py-10 space-y-8">
        {/* Ambient glow */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-[360px] w-[360px] rounded-full bg-gold/6 blur-[100px]" />
          <div className="absolute bottom-0 -left-24 h-[280px] w-[280px] rounded-full bg-gold/4 blur-[100px]" />
        </div>

        {/* Header */}
        <header className="text-center space-y-2">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold/35 bg-obsidian shadow-[0_0_24px_rgba(201,168,76,0.2)]">
            <ScrollText className="h-5 w-5 text-gold" strokeWidth={1.5} />
          </div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-gold/70">Sermon Composer</p>
          <h1 className="font-display text-3xl text-foreground">How shall we build today?</h1>
        </header>

        {/* Flash-draft shortcut */}
        <FlashDraftInput
          prefilledScripture={scripture}
          onSubmit={(value) => {
            /* Pre-fill and jump straight to configurator */
            navigate({
              to: "/workspace/sermons/choice",
              search: { scripture: value, scriptureText: undefined, path: "coauthor" },
              replace: true,
            });
          }}
        />

        {/* Two path cards */}
        <div className="space-y-4">
          {/* Co-Author */}
          <PathCard
            icon={<Sparkles className="h-5 w-5 text-gold" strokeWidth={1.5} />}
            eyebrow="The Co-Author"
            title="Collaborate with Selah"
            description="Architect a structured manuscript from your core theme. Selah helps shape the outline, manuscript, and voice."
            tag="Guided by AI"
            onClick={() => setView("coauthor")}
          />

          {/* Masterpiece */}
          <PathCard
            icon={<PenLine className="h-5 w-5 text-gold" strokeWidth={1.5} />}
            eyebrow="The Masterpiece"
            title="Begin with a blank canvas"
            description="A silent sanctuary for pure focus. Start fresh with your own voice. AI lenses are available whenever you want a second opinion."
            tag="Pure creative focus"
            onClick={handleMasterpiece}
            loading={creating}
          />
        </div>

        {/* Back link */}
        <p className="text-center text-xs text-muted-foreground/40">
          <Link to="/workspace" className="hover:text-gold-soft transition-colors">
            ← Back to workspace
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

/* ─── Flash-draft shortcut ──────────────────────────────────────────────── */

function FlashDraftInput({
  prefilledScripture,
  onSubmit,
}: {
  prefilledScripture?: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(prefilledScripture ?? "");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Flash-draft — enter a theme or scripture and press Enter…"
        className={cn(
          "w-full rounded-2xl border border-gold/20 bg-obsidian-elevated/40 px-5 py-4 pr-12",
          "text-sm text-foreground placeholder:text-muted-foreground/40",
          "outline-none focus:border-gold/45 transition-colors",
          "shadow-[inset_0_1px_0_rgba(201,168,76,0.06)]",
        )}
        aria-label="Flash-draft — enter a theme or scripture and press Enter…"
      />
      {value.trim() && (
        <button
          type="button"
          onClick={() => onSubmit(value.trim())}
          aria-label="Start Co-Author with this input"
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-gold/20 hover:bg-gold/35 text-gold transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ─── Path card ─────────────────────────────────────────────────────────── */

function PathCard({
  icon,
  eyebrow,
  title,
  description,
  tag,
  onClick,
  loading = false,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  tag: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "group relative w-full text-left overflow-hidden rounded-2xl border border-gold/20 bg-obsidian-elevated/40",
        "px-6 py-5 transition-all duration-300",
        "hover:border-gold/40 hover:-translate-y-0.5",
        "hover:shadow-[0_8px_32px_rgba(201,168,76,0.12)]",
        "shadow-[0_2px_16px_rgba(0,0,0,0.2)]",
        "touch-manipulation select-none active:scale-[0.985] active:border-gold/55 active:bg-gold/[0.06] motion-reduce:active:scale-100",
        loading && "opacity-60 cursor-not-allowed",
      )}
    >
      {/* Subtle top shimmer */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent"
      />

      <div className="flex items-start gap-4">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-obsidian shadow-[0_0_16px_rgba(201,168,76,0.15)] transition-transform group-hover:scale-105">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.26em] text-gold/65 mb-0.5">{eyebrow}</p>
          <p className="font-display text-base text-foreground mb-1">{title}</p>
          <p className="text-xs text-muted-foreground/65 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="inline-flex items-center rounded-full border border-gold/20 bg-gold/6 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-gold/70">
          {tag}
        </span>
        <span className="text-gold/50 transition-transform group-hover:translate-x-1 duration-200">
          →
        </span>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-obsidian/60">
          <span className="text-sm text-gold-soft">Opening the manuscript…</span>
        </div>
      )}
    </button>
  );
}
