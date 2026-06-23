import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { AccountSkeleton } from "@/components/ui/page-skeletons";
import { useAuth } from "@/hooks/useAuth";
import { useIntelligencePref } from "@/hooks/useIntelligencePref";
import { cn } from "@/lib/utils";
import type { IntelligencePref } from "@/lib/intelligencePref";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/intelligence")({
  head: () => ({
    meta: [
      { title: "Deep Dive Preference — SanctumIQ" },
      {
        name: "description",
        content: "Choose which AI powers your Deep Dives across SanctumIQ.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IntelligenceSettingsPage,
});

const OPTIONS: Array<{
  value: IntelligencePref;
  label: string;
  tagline: string;
  detail: string;
}> = [
  {
    value: "smart",
    label: "Auto",
    tagline: "Recommended",
    detail:
      "SanctumIQ chooses for you based on the task. Word studies and historical context open in Perplexity for sourced citations. Sermon application and creative synthesis open in ChatGPT. Most ministers will want this.",
  },
  {
    value: "chatgpt",
    label: "Always ChatGPT",
    tagline: "Synthesis & application",
    detail:
      "Every Deep Dive opens in ChatGPT regardless of context — best if you prefer one place for all your research and sermon preparation.",
  },
  {
    value: "perplexity",
    label: "Always Perplexity",
    tagline: "Citations & sourced research",
    detail:
      "Every Deep Dive opens in Perplexity regardless of context — best if you rely on cited sources and want linked references for every study.",
  },
];

function IntelligenceSettingsPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <LoadingAppShell pageTitle="Deep Dive Preference">
        <AccountSkeleton text="Opening intelligence preferences…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Intelligence"
        title="Sign in to set your intelligence source"
        description="Pick which AI powers your Deep Dives across the sanctuary."
        redirectTo="/settings/intelligence"
      />
    );
  }

  return (
    <AppShell pageTitle="Deep Dive Preference">
      <IntelligenceForm userId={user.id} />
    </AppShell>
  );
}

function IntelligenceForm({ userId }: { userId: string }) {
  const { pref, loading, update } = useIntelligencePref(userId);

  const handleSelect = async (next: IntelligencePref) => {
    if (next === pref) return;
    try {
      await update(next);
      toast.success("Intelligence preference updated");
    } catch (err) {
      console.error("update intelligence pref", err);
      toast.error("Couldn't save preference — try again.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 space-y-8">
      <Link
        to="/settings"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold-soft transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Settings
      </Link>

      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold flex items-center gap-2">
          <Sparkles className="h-3 w-3" /> Research
        </p>
        <h1 className="font-display text-3xl text-foreground">Deep Dive Preference</h1>
        <p className="text-sm text-muted-foreground/80 max-w-prose">
          When you tap Deep Dive on a passage, which AI opens? Set your preference once here — it
          applies across the reader, Blueprint, and Seek Wisdom. You can always change it.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading preference…
        </div>
      ) : (
        <fieldset className="space-y-3">
          <legend className="sr-only">Preferred intelligence</legend>
          {OPTIONS.map((opt) => {
            const active = pref === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => void handleSelect(opt.value)}
                aria-pressed={active}
                className={cn(
                  "w-full text-left rounded-xl border px-5 py-4 transition-colors",
                  "flex items-start gap-4",
                  active
                    ? "border-gold/50 bg-gold/10"
                    : "border-gold/12 bg-obsidian-elevated/30 hover:bg-gold/5 hover:border-gold/25",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 h-3 w-3 rounded-full border transition-colors shrink-0",
                    active ? "bg-gold border-gold" : "border-gold/40 bg-transparent",
                  )}
                />
                <span className="flex-1 min-w-0">
                  <span className="flex items-baseline justify-between gap-3 flex-wrap">
                    <span className="font-display text-base text-foreground">{opt.label}</span>
                    <span className="text-[10px] uppercase tracking-[0.22em] text-gold/80">
                      {opt.tagline}
                    </span>
                  </span>
                  <span className="block text-xs text-muted-foreground/80 mt-1.5 leading-relaxed">
                    {opt.detail}
                  </span>
                </span>
              </button>
            );
          })}
        </fieldset>
      )}

      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60">
        Saved to your profile · applies to every Deep Dive in the app
      </p>
    </div>
  );
}
