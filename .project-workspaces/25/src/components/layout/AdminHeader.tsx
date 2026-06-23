import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useCallback } from "react";
import { AvatarMenu } from "@/components/layout/AvatarMenu";
import { useAuth } from "@/hooks/useAuth";

/**
 * AdminHeader — minimal back-office chrome for /admin and /admin/webhooks.
 * Mirrors the public /about header style (SanctumIQ wordmark + smart back)
 * with the signed-in avatar on the right.
 */
export function AdminHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const handleSmartBack = useCallback(() => {
    const canGoBack =
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer !== "" &&
      !document.referrer.includes(window.location.pathname);
    if (canGoBack) router.history.back();
    else navigate({ to: "/reader" });
  }, [navigate, router]);

  return (
    <header className="hairline-b overflow-hidden rounded-b-2xl bg-obsidian/85 backdrop-blur-md">
      <div
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-6"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={handleSmartBack}
            aria-label="Go back"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-gold-soft transition-colors hover:text-gold"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img
              src="/sanctum-seal.svg"
              alt=""
              aria-hidden="true"
              className="h-6 w-6 shrink-0 opacity-90"
              style={{ filter: "drop-shadow(0 0 4px rgba(201,168,76,0.25))" }}
            />
            <span className="truncate font-display text-xl tracking-wide text-gold-soft sm:text-2xl">
              Sanctum<span className="text-gold">IQ</span>
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70 sm:inline">
              Admin
            </span>
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link
            to="/reader"
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-gold-soft sm:text-xs sm:tracking-[0.2em]"
          >
            <span className="sm:hidden">Reader</span>
            <span className="hidden sm:inline">Open reader</span>
          </Link>
          {user && <AvatarMenu />}
        </div>
      </div>
    </header>
  );
}
