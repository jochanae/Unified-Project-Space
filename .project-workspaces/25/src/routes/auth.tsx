import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string; mode?: "signin" | "signup" } => {
    // Only allow same-origin internal paths to prevent open-redirect / phishing.
    // Must start with "/" but NOT "//" (which is protocol-relative and routes off-site).
    const raw = typeof search.redirect === "string" ? search.redirect : undefined;
    const safe =
      raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")
        ? raw
        : undefined;
    return {
      redirect: safe,
      mode: search.mode === "signup" ? "signup" : search.mode === "signin" ? "signin" : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Enter the Sanctuary — SanctumIQ" },
      { name: "description", content: "Sign in or create your private SanctumIQ sanctuary." },
      { property: "og:title", content: "Enter the Sanctuary — SanctumIQ" },
      {
        property: "og:description",
        content: "Sign in or create your private SanctumIQ sanctuary.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect: redirectSearch, mode: initialMode } = useSearch({ from: "/auth" });
  const redirect = redirectSearch ?? "/reader";
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup" | "reset">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<null | "google" | "apple">(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: redirect });
    }
  }, [user, loading, redirect, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/reader`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Welcome to the Sanctuary", {
          description: "You're in. Verify your email later to unlock Finance & Workspace.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    // Guard against double-taps and against firing before the auth provider
    // has finished restoring the session (race during INITIAL_SESSION).
    if (oauthBusy || loading) return;
    if (user) {
      const name =
        (user.user_metadata?.display_name as string | undefined)?.trim() ||
        (user.user_metadata?.full_name as string | undefined)?.trim() ||
        (user.email ? user.email.split("@")[0] : "friend");
      const dest = redirect === "/reader" ? "the Reader" : "your sanctuary";
      toast.success(`Welcome back, ${name}`, {
        description: `You're already signed in — taking you to ${dest}.`,
        duration: 2200,
      });
      window.setTimeout(() => navigate({ to: redirect }), 700);
      return;
    }
    setOauthBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}${redirect}`,
      });
      if (result?.redirected) return; // browser is leaving the page
      if (result?.error) {
        toast.error(
          result.error.message ?? `${provider === "google" ? "Google" : "Apple"} sign-in failed`,
        );
        setOauthBusy(null);
      } else {
        // Tokens received and session set — useAuth listener will fire and redirect.
        setOauthBusy(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed. Try again.");
      setOauthBusy(null);
    }
  };

  const handleGoogle = () => handleOAuth("google");
  const handleApple = () => handleOAuth("apple");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your email address.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth?mode=signin`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-foreground">
      <div className="mx-auto max-w-md px-6 py-16 md:py-24">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-gold-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to landing page
          </Link>
        </div>

        <div className="text-center mb-10">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/25"
            style={{ background: "oklch(0.74 0.115 85 / 0.08)" }}
          >
            <img src="/sanctum-seal.svg" alt="SanctumIQ seal" className="h-10 w-10" />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold mb-4">
            {mode === "reset"
              ? "Password Recovery"
              : mode === "signup"
                ? "Begin Your Sanctuary"
                : "Enter the Sanctuary"}
          </p>
          <h1 className="font-display text-4xl text-foreground">
            {mode === "reset"
              ? "Reset your password"
              : mode === "signup"
                ? "Create your account"
                : "Welcome back"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {mode === "reset"
              ? "We'll send a recovery link to your email."
              : mode === "signup"
                ? "A private space for ministerial excellence."
                : "Sign in to continue your study."}
          </p>
        </div>

        <div className="hairline rounded-lg p-6 md:p-8 bg-obsidian-elevated/50 space-y-5">
          {/* ── Password reset mode ─────────────────────────────── */}
          {mode === "reset" && (
            <div className="space-y-5">
              {resetSent ? (
                <div className="text-center space-y-3 py-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/25 bg-gold/8">
                    <Mail className="h-5 w-5 text-gold" />
                  </div>
                  <p className="font-display text-base text-gold-soft">Check your inbox</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A reset link has been sent to <span className="text-foreground">{email}</span>.
                    Check your spam folder if it doesn&apos;t appear within a minute.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setResetSent(false);
                    }}
                    className="text-sm text-gold-soft underline underline-offset-2 hover:text-gold transition-colors"
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                <>
                  <form onSubmit={handleReset} className="space-y-4">
                    <Field icon={<Mail className="h-4 w-4" />}>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your email address"
                        autoComplete="email"
                        className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                        aria-label="Your email address"
                      />
                    </Field>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={cn(
                        "w-full rounded-md bg-gold/90 hover:bg-gold text-obsidian font-medium px-4 py-3 text-sm tracking-wide transition-colors",
                        submitting && "opacity-60 cursor-not-allowed",
                      )}
                    >
                      {submitting ? "Sending…" : "Send reset link"}
                    </button>
                  </form>
                  <p className="text-center text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className="text-gold-soft hover:text-gold transition-colors"
                    >
                      Back to sign in
                    </button>
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── Sign in / Sign up mode ───────────────────────────── */}
          {mode !== "reset" && (
            <>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={oauthBusy !== null || loading}
                  aria-busy={oauthBusy === "google"}
                  className={cn(
                    "w-full flex items-center justify-center gap-3 rounded-md border border-gold/25 bg-obsidian/40 px-4 py-3 text-sm text-foreground hover:bg-gold/5 transition-colors",
                    (oauthBusy !== null || loading) && "opacity-60 cursor-not-allowed",
                  )}
                >
                  <GoogleGlyph />
                  {oauthBusy === "google" ? "Opening Google…" : "Continue with Google"}
                </button>
                <button
                  type="button"
                  onClick={handleApple}
                  disabled={oauthBusy !== null || loading}
                  aria-busy={oauthBusy === "apple"}
                  className={cn(
                    "w-full flex items-center justify-center gap-3 rounded-md border border-gold/25 bg-obsidian/40 px-4 py-3 text-sm text-foreground hover:bg-gold/5 transition-colors",
                    (oauthBusy !== null || loading) && "opacity-60 cursor-not-allowed",
                  )}
                >
                  <AppleGlyph />
                  {oauthBusy === "apple" ? "Opening Apple…" : "Continue with Apple"}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-gold/15" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
                <span className="h-px flex-1 bg-gold/15" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <Field icon={<UserIcon className="h-4 w-4" />}>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display name (optional)"
                      className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                      aria-label="Display name (optional)"
                    />
                  </Field>
                )}
                <Field icon={<Mail className="h-4 w-4" />}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    autoComplete="email"
                    className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
                    aria-label="Email"
                  />
                </Field>
                <Field icon={<Lock className="h-4 w-4" />}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/60 pr-8"
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold-soft transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </Field>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "w-full rounded-md bg-gold/90 hover:bg-gold text-obsidian font-medium px-4 py-3 text-sm tracking-wide transition-colors",
                    submitting && "opacity-60 cursor-not-allowed",
                  )}
                >
                  {submitting ? "Working…" : mode === "signup" ? "Enter the Sanctuary" : "Sign In"}
                </button>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => setMode("reset")}
                    className="w-full text-center text-xs text-muted-foreground/60 hover:text-gold-soft transition-colors pt-1"
                  >
                    Forgot password?
                  </button>
                )}
              </form>

              <p className="text-center text-xs text-muted-foreground">
                {mode === "signup" ? "Already have an account?" : "New to SanctumIQ?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                  className="text-gold-soft hover:text-gold transition-colors"
                >
                  {mode === "signup" ? "Sign in" : "Create one"}
                </button>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/" className="hover:text-gold-soft transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative flex items-center gap-3 rounded-md border border-gold/20 bg-obsidian/40 px-3 py-3 focus-within:border-gold/50 transition-colors">
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </div>
  );
}

function AppleGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.8 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.4 35 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.5 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.3 5.3C41.9 35.6 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
