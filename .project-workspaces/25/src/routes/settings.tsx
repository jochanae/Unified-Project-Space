import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronRight,
  KeyRound,
  Bell,
  BookOpen,
  Calendar,
  Church,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { AccountSkeleton } from "@/components/ui/page-skeletons";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SanctumIQ" },
      { name: "description", content: "Manage your SanctumIQ profile, security, and preferences." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsLayout,
});

function SettingsLayout() {
  const { user, loading } = useAuth();
  const matchRoute = useMatchRoute();
  const isIndex = !!matchRoute({ to: "/settings", fuzzy: false });

  if (loading) {
    return (
      <LoadingAppShell pageTitle="Settings">
        <AccountSkeleton text="Opening settings…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Settings"
        title="Sign in to manage your account"
        description="Settings are only available to signed-in stewards."
        redirectTo="/settings"
      />
    );
  }

  if (!isIndex) {
    return <Outlet />;
  }

  return (
    <AppShell pageTitle="Settings">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-8">
        <Link
          to="/account"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold-soft transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Account
        </Link>

        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-2">Sanctuary</p>
          <h1 className="font-display text-3xl text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Quietly tune your profile, security, and how SanctumIQ reaches you.
          </p>
        </div>

        <nav className="space-y-2">
          <SettingsLink
            to="/settings/profile"
            icon={<UserCircle className="h-4 w-4 text-gold/80" />}
            title="Profile"
            description="Display name, bio, photo, and email."
          />
          <SettingsLink
            to="/settings/security"
            icon={<KeyRound className="h-4 w-4 text-gold/80" />}
            title="Security"
            description="Change your password."
          />
          <SettingsLink
            to="/settings/notifications"
            icon={<Bell className="h-4 w-4 text-gold/80" />}
            title="Notifications"
            description="Daily verse, plan reminders, quiet hours."
          />
          <SettingsLink
            to="/settings/reading"
            icon={<BookOpen className="h-4 w-4 text-gold/80" />}
            title="Reading"
            description="Reader voice, text size, and reading rhythm."
          />
          <SettingsLink
            to="/settings/calendar-sync"
            icon={<Calendar className="h-4 w-4 text-gold/80" />}
            title="Calendar sync"
            description="Subscribe to your plans, Selah sessions, and workspace events."
          />
          <SettingsLink
            to="/settings/intelligence"
            icon={<Sparkles className="h-4 w-4 text-gold/80" />}
            title="Deep Dive Preference"
            description="Choose which AI opens when you research a passage — Auto, ChatGPT, or Perplexity."
          />
          <SettingsLink
            to="/settings/service-mode"
            icon={<Church className="h-4 w-4 text-gold/80" />}
            title="Service mode"
            description="Silence the sanctuary during worship."
          />
        </nav>
      </div>
    </AppShell>
  );
}

function SettingsLink({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-xl hairline bg-obsidian-elevated/30 px-5 py-4 hover:bg-gold/5 transition-colors"
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-display text-base text-foreground group-hover:text-gold-soft transition-colors">
          {title}
        </span>
        <span className="block text-xs text-muted-foreground/70 mt-0.5">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-gold-soft transition-colors" />
    </Link>
  );
}
