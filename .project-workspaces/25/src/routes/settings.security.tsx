import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { AccountSkeleton } from "@/components/ui/page-skeletons";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings/security")({
  head: () => ({
    meta: [
      { title: "Settings — SanctumIQ" },
      { name: "description", content: "Manage your SanctumIQ account security and password." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [oauthEmail, setOauthEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Detect OAuth-only accounts (Google sign-in). These users don't have a
  // Supabase password to change here — they manage credentials with the
  // identity provider. We still show the form for email/password users.
  const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [];
  const isOAuthOnly = providers.length > 0 && !providers.includes("email");

  if (authLoading) {
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
        description="Account security settings are only available to signed-in stewards."
        redirectTo="/settings"
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    setSubmitting(true);

    // For OAuth users — update both email and password
    if (isOAuthOnly) {
      const updates: { password: string; email?: string } = { password: newPassword };
      if (oauthEmail.trim() && oauthEmail.trim() !== user?.email) {
        updates.email = oauthEmail.trim();
      }
      const { error } = await supabase.auth.updateUser(updates);
      setSubmitting(false);
      if (error) {
        toast.error(error.message || "Could not add sign-in method.");
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      setOauthEmail("");
      toast.success("Email and password sign-in added. You can now use either method.");
      return;
    }

    // For existing email/password users — just update the password
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Could not update password.");
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated. Use it next time you sign in.");
  };

  return (
    <AppShell pageTitle="Settings">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-8">
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold-soft transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Settings
        </Link>

        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-2">Security</p>
          <h1 className="font-display text-3xl text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Manage how you sign in to SanctumIQ.
          </p>
        </div>

        <section className="hairline rounded-xl bg-obsidian-elevated/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="h-4 w-4 text-gold/80" />
            <h2 className="font-display text-lg text-foreground">Change password</h2>
          </div>

          {isOAuthOnly ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-md border border-gold/20 bg-gold/8 p-4 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                <p>
                  You signed in with{" "}
                  <span className="text-gold-soft capitalize">{providers.join(", ")}</span>. You can
                  also add an email and password so you have a second way to sign in.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gold/70">
                  Add email &amp; password sign-in
                </p>
                <div>
                  <label
                    htmlFor="oauth-email"
                    className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2"
                  >
                    Email address
                  </label>
                  <input
                    id="oauth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={oauthEmail}
                    onChange={(e) => setOauthEmail(e.target.value)}
                    className="w-full rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                    placeholder={user?.email ?? "Your email address"}
                  />
                </div>
                <div>
                  <label
                    htmlFor="oauth-password"
                    className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2"
                  >
                    New password
                  </label>
                  <input
                    id="oauth-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <label
                    htmlFor="oauth-confirm"
                    className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2"
                  >
                    Confirm password
                  </label>
                  <input
                    id="oauth-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                    placeholder="Re-enter password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-md bg-gold px-6 py-2.5 text-sm font-medium text-obsidian hover:bg-gold-soft transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Add sign-in method"}
                </button>
                <p className="text-[11px] text-muted-foreground/60">
                  After saving, you can sign in with either Google or your email and password.
                </p>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2"
                >
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md hairline bg-obsidian/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                  placeholder="Re-enter your new password"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-md bg-gold px-6 py-2.5 text-sm font-medium text-obsidian hover:bg-gold-soft transition-colors disabled:opacity-50"
              >
                {submitting ? "Updating…" : "Update password"}
              </button>

              <p className="text-[11px] text-muted-foreground/60">
                You'll stay signed in on this device. Other sessions will need the new password.
              </p>
            </form>
          )}
        </section>
      </div>
    </AppShell>
  );
}
