import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Globe, LogOut, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { CalendarSync } from "@/components/account/CalendarSync";
import { ProfileCard } from "@/components/account/ProfileCard";
import { PlanCard } from "@/components/account/PlanCard";
import { highestTier } from "@/components/account/TierBadge";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { AccountSkeleton } from "@/components/ui/page-skeletons";
import { InstallAppButton } from "@/components/InstallAppButton";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useRoles } from "@/hooks/useRoles";
import { deleteOwnAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — SanctumIQ" },
      { name: "description", content: "Manage your SanctumIQ account, plan, and profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDanger, setShowDanger] = useState(false);

  const fallbackName =
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Friend";
  const fallbackAvatar =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null;

  const { displayName, avatarUrl, setProfile } = useProfile(user?.id, fallbackName, fallbackAvatar);
  const { roles, loading: rolesLoading } = useRoles(user?.id);

  const loading = authLoading || rolesLoading;

  if (loading) {
    return (
      <LoadingAppShell pageTitle="Your Account">
        <AccountSkeleton text="Fetching your account…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Account"
        title="Your account"
        description="Sign in to manage your profile, plan, and preferences."
        redirectTo="/account"
        showReaderLink
      />
    );
  }

  const tier = highestTier(roles);
  const name = displayName || fallbackName;

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast.error("Type DELETE to confirm.");
      return;
    }
    setDeleting(true);
    try {
      await deleteOwnAccount({ data: { confirm: "DELETE" } });
      toast.success("Account deleted. Farewell, friend.");
      await signOut();
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete account.");
      setDeleting(false);
    }
  };

  return (
    <AppShell pageTitle="Your Account">
      <div className="mx-auto max-w-lg px-6 py-16 space-y-8">
        <ProfileCard
          userId={user.id}
          email={user.email}
          displayName={name}
          avatarUrl={avatarUrl}
          onChange={(next) =>
            setProfile((c) => ({
              ...c,
              displayName: next.displayName ?? c.displayName,
              avatarUrl: next.avatarUrl !== undefined ? next.avatarUrl : c.avatarUrl,
              loading: false,
            }))
          }
        />

        <PlanCard tier={tier} />

        <Link
          to="/account/board"
          className="flex items-center gap-3 rounded-xl hairline bg-obsidian-elevated/30 px-6 py-4 text-sm text-foreground hover:bg-gold/5 transition-colors"
        >
          <Globe className="h-4 w-4 text-gold/80" />
          <span className="flex-1 text-left">
            <span className="block">Your Board</span>
            <span className="block text-xs text-muted-foreground/70 mt-0.5">
              Claim your handle. Share poems, scripture, and links publicly — opt-in.
            </span>
          </span>
        </Link>

        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-xl hairline bg-obsidian-elevated/30 px-6 py-4 text-sm text-foreground hover:bg-gold/5 transition-colors"
        >
          <SettingsIcon className="h-4 w-4 text-gold/80" />
          <span className="flex-1 text-left">
            <span className="block">Settings</span>
            <span className="block text-xs text-muted-foreground/70 mt-0.5">
              Profile, security, notifications, reading & service mode.
            </span>
          </span>
        </Link>

        <CalendarSync userId={user.id} />

        <div className="rounded-xl hairline bg-obsidian-elevated/30 p-6 text-center space-y-3">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Sanctuary App</p>
          <p className="text-sm text-muted-foreground">
            Install SanctumIQ to your home screen for a quiet, fullscreen experience.
          </p>
          <InstallAppButton className="w-full" />
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl hairline bg-obsidian-elevated/30 px-6 py-4 text-sm text-muted-foreground hover:text-foreground hover:bg-gold/5 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            <h2 className="font-display text-base text-foreground">Danger zone</h2>
          </div>
          <p className="text-xs text-muted-foreground/80">
            Permanently delete your SanctumIQ account. This cannot be undone — your notes,
            highlights, vault, and reading history will be removed.
          </p>

          {!showDanger ? (
            <button
              onClick={() => setShowDanger(true)}
              className="w-full rounded-md border border-destructive/40 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              Delete my account
            </button>
          ) : (
            <div className="space-y-3">
              <label
                htmlFor="confirm-delete"
                className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
              >
                Type <span className="text-destructive font-mono">DELETE</span> to confirm
              </label>
              <input
                id="confirm-delete"
                type="text"
                autoComplete="off"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full rounded-md border border-destructive/30 bg-obsidian/40 px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-destructive/60"
                placeholder="DELETE"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDanger(false);
                    setConfirmText("");
                  }}
                  disabled={deleting}
                  className="flex-1 rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting || confirmText !== "DELETE"}
                  className="flex-1 rounded-md bg-destructive px-4 py-2.5 text-sm text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {deleting ? "Deleting…" : "Permanently delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
