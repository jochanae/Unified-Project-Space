import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ScrollText, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useSelah } from "@/hooks/useSelah";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { ArchitectLibraryCard } from "@/components/workspace/ArchitectLibraryCard";
import { ActivityRails } from "@/components/workspace/ActivityRails";
import { WorkspaceSkeleton } from "@/components/ui/page-skeletons";
import { RoleIdentity } from "@/components/layout/RoleIdentity";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { PlanGenerator } from "@/components/workspace/PlanGenerator";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";

export const Route = createFileRoute("/workspace/")({
  head: () => ({
    meta: [
      { title: "Workspace — SanctumIQ" },
      {
        name: "description",
        content: "The Ministerial Generative Workspace for sermons, programs, and flyers.",
      },
      { property: "og:title", content: "Workspace — SanctumIQ" },
      {
        property: "og:description",
        content: "The Ministerial Generative Workspace for sermons, programs, and flyers.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const { user, loading } = useAuth();
  const { hasAnyRole, loading: rolesLoading } = useRoles(user?.id);
  const canUseWorkspace = hasAnyRole(["minister", "church_partner", "admin"]);

  if (loading || rolesLoading) {
    return (
      <LoadingAppShell pageTitle="Prepare">
        <WorkspaceSkeleton text="Preparing your workspace…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        icon={Sparkles}
        eyebrow="Ministry Workspace"
        title="Where preparation meets purpose"
        description="Sermon expansion, program planning, and ministry tools — built for partners who carry the work."
        redirectTo="/workspace"
        features={[
          "Sermon thought expansion canvas",
          "Service and program planning",
          "Ministry organization workflows",
        ]}
        showReaderLink
      />
    );
  }

  if (!canUseWorkspace) {
    return (
      <SanctuaryGate
        icon={Sparkles}
        eyebrow="Ministry Workspace"
        title="Reserved for ministers and church partners"
        description="This workspace opens for the minister and church partner tiers, with separate support paths behind the scenes."
        redirectTo="/pricing"
        features={[
          "Sermon thought expansion canvas",
          "Service and program planning",
          "Ministry organization workflows",
        ]}
        showReaderLink
      />
    );
  }

  return (
    <AppShell pageTitle="Prepare">
      {/* Ambient gold bloom backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-32 h-[420px] w-[420px] rounded-full bg-gold/8 blur-[120px]" />
        <div className="absolute top-1/3 -left-40 h-[340px] w-[340px] rounded-full bg-gold/5 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <header className="mb-10 flex flex-col items-center text-center">
          <RoleIdentity />
          <p className="mt-4 max-w-xl text-sm text-muted-foreground leading-relaxed">
            Sit with scripture, draft sermons, and shape your calendar — the work you save lands
            here, ready when you return.
          </p>
          <div
            aria-hidden
            className="mt-6 h-px w-24 bg-gradient-to-r from-transparent via-gold/40 to-transparent"
          />
        </header>

        {/* Activity rails — recent sermons + upcoming plan events */}
        <ActivityRails userId={user.id} />

        {/* Selah — preparation mode entry */}
        <SelahPrepPanel />

        {/* Sermon Composer hero — links to the choice portal. */}
        <Link
          to="/workspace/sermons/choice"
          search={{ scripture: undefined, scriptureText: undefined, path: undefined }}
          aria-label="Open the sermon composer"
          className="group relative mb-8 block overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-obsidian-elevated/60 via-obsidian-elevated/40 to-obsidian/60 backdrop-blur-xl px-6 py-5 transition-all duration-300 hover:border-gold/45 hover:-translate-y-0.5 shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.15)] touch-manipulation select-none active:scale-[0.985] active:border-gold/55 active:bg-gold/[0.04] active:shadow-[0_2px_12px_rgba(201,168,76,0.18)] motion-reduce:active:scale-100"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gold/10 blur-3xl transition-opacity duration-500 group-hover:opacity-150"
          />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-obsidian shadow-[0_0_20px_rgba(201,168,76,0.25)] transition-transform group-hover:scale-105">
                <ScrollText className="h-5 w-5 text-gold" strokeWidth={1.5} />
              </span>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.28em] text-gold/75">
                  Sermon Composer
                </div>
                <div className="mt-1 font-display text-base text-foreground">
                  The Architect's launchpad
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Choose your path — manuscript, outline, or co-author with Selah.
                </div>
              </div>
            </div>
            <ChevronRight className="relative mt-1 h-5 w-5 shrink-0 text-gold/70 transition-transform group-hover:translate-x-1" />
          </div>

          {/* Process legend — three bronze beats. */}
          <ol
            aria-label="Sermon composer process: outline, manuscript, revise"
            className="relative mt-5 flex items-center gap-2"
          >
            {(["Outline", "Manuscript", "Revise"] as const).map((label, i, arr) => (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  aria-hidden
                  className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-gold/55 shadow-[0_0_8px_rgba(201,168,76,0.45)]"
                />
                <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold-soft/85">
                  {label}
                </span>
                {i < arr.length - 1 && (
                  <span
                    aria-hidden
                    className="ml-1 h-px flex-1 bg-gradient-to-r from-gold/35 to-gold/10"
                  />
                )}
              </li>
            ))}
          </ol>

          <div className="relative mt-4 flex items-center justify-end">
            <span
              role="presentation"
              className="inline-flex items-center gap-2 rounded-full border border-gold/45 bg-gold/8 px-4 py-1.5 text-[10px] uppercase tracking-[0.22em] text-gold-soft transition-all duration-300 group-hover:border-gold/70 group-hover:bg-gold/14 group-hover:shadow-[0_0_18px_rgba(201,168,76,0.28)]"
            >
              Choose Your Path
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>

        {/* Library — recent sermons with ghost-card empty state. */}
        <ArchitectLibraryCard userId={user.id} />

        {/* Plan generator */}
        <PlanGenerator userId={user.id} />
      </div>
    </AppShell>
  );
}

/* ─────────────────────────────────────────────────────────────
   SELAH PREP PANEL
   ───────────────────────────────────────────────────────────── */
function SelahPrepPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { reflect, reflection, status, reset } = useSelah();

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    void reflect(trimmed, trimmed, "prepare");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full mb-6 flex items-center justify-center gap-2 rounded-xl border border-gold/15 bg-obsidian-elevated/30 backdrop-blur-xl px-5 py-4 text-sm text-gold-soft hover:bg-gold/5 hover:border-gold/30 transition-all group"
      >
        <Sparkles
          className="h-4 w-4 text-gold group-hover:scale-110 transition-transform"
          strokeWidth={1.5}
        />
        Ask Selah to reflect on your scripture before you prepare
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-gold/20 bg-obsidian-elevated/40 backdrop-blur-xl p-5 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-gold/70" strokeWidth={1.5} />
          <span className="text-[10px] uppercase tracking-[0.28em] text-gold/70">
            Selah — Preparation
          </span>
        </div>
        <button
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {status === "idle" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            What scripture or theme are you preparing around? Selah will help you sit with it before
            you build.
          </p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Romans 8:28 — a series on trusting God in suffering"
            rows={2}
            className="w-full rounded-lg border border-gold/20 bg-obsidian/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-gold/40 transition-colors resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="rounded-lg bg-gold/90 hover:bg-gold text-obsidian text-sm font-medium px-4 py-2 disabled:opacity-40 transition-colors"
          >
            Reflect with Selah
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="flex gap-1.5 py-3">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-1.5 w-1.5 rounded-full bg-gold/50"
              style={{
                animation: "pulse 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}

      {status === "done" && reflection && (
        <div className="space-y-3">
          <blockquote
            className="font-display italic text-base leading-relaxed text-foreground/90"
            style={{ lineHeight: "1.65" }}
          >
            {reflection}
          </blockquote>
          <button
            onClick={reset}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Ask again
          </button>
        </div>
      )}

      {status === "error" && (
        <p className="text-sm italic text-muted-foreground/70">
          Reflection unavailable right now. Try again.
        </p>
      )}
    </div>
  );
}
