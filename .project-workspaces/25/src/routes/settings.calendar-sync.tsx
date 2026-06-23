import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { AccountSkeleton } from "@/components/ui/page-skeletons";
import { CalendarSync } from "@/components/account/CalendarSync";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/settings/calendar-sync")({
  head: () => ({
    meta: [
      { title: "Calendar Sync — SanctumIQ" },
      { name: "description", content: "Subscribe to SanctumIQ in Apple, Google, or Outlook." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarSyncPage,
});

function CalendarSyncPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <LoadingAppShell pageTitle="Calendar Sync">
        <AccountSkeleton text="Opening calendar sync…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Calendar Sync"
        title="Sign in to sync your calendar"
        description="Calendar Sync is only available to signed-in stewards."
        redirectTo="/settings/calendar-sync"
      />
    );
  }

  return (
    <AppShell pageTitle="Calendar Sync">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-8">
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold-soft transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Settings
        </Link>

        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-2">Sanctuary</p>
          <h1 className="font-display text-3xl text-foreground">Calendar Sync</h1>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Subscribe once. Choose what flows into your calendar.
          </p>
        </div>

        <CalendarSync userId={user.id} showFeedControls />
      </div>
    </AppShell>
  );
}
