/**
 * LoginToast — High-end welcome toast that appears once per session
 * immediately after a successful sign-in.
 *
 * Tiered:
 *  - Paid (minister, church_partner, admin): full premium "Access unlocked"
 *    moment with a tip about how the header anchors them to book + verse.
 *  - Free: a simpler "Welcome back" greeting.
 *
 * Renders nothing visible — it just dispatches a sonner toast and exits.
 * Uses sessionStorage so the moment fires exactly once per browser session.
 */

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useRoles } from "@/hooks/useRoles";

const SESSION_KEY = "sanctumiq:welcome-toast:fired";

export function LoginToast() {
  const { user, isReady } = useAuth();
  const { roles, loading: rolesLoading } = useRoles(user?.id);
  const { displayName } = useProfile(user?.id);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isReady || rolesLoading) return;
    if (!user) return;
    if (firedRef.current) return;

    // Per-session guard so the toast fires exactly once per sign-in moment.
    let alreadyFired = false;
    try {
      alreadyFired = sessionStorage.getItem(SESSION_KEY) === user.id;
    } catch {
      /* sessionStorage may be unavailable (private mode) — fall through */
    }
    if (alreadyFired) {
      firedRef.current = true;
      return;
    }

    firedRef.current = true;
    try {
      sessionStorage.setItem(SESSION_KEY, user.id);
    } catch {
      /* ignore */
    }

    const isPaid =
      roles.includes("minister") || roles.includes("church_partner") || roles.includes("admin");

    // Resolve a friendly first name — never show raw email
    const firstName = (() => {
      if (displayName && !displayName.includes("@")) return displayName.split(" ")[0];
      const metaName =
        (user.user_metadata?.display_name as string | undefined)?.trim() ||
        (user.user_metadata?.full_name as string | undefined)?.trim();
      if (metaName && !metaName.includes("@")) return metaName.split(" ")[0];
      return null;
    })();

    // Slight delay so the toast lands after the route paints.
    const handle = window.setTimeout(() => {
      if (isPaid) {
        toast(
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/45 bg-gold/12"
              aria-hidden="true"
            >
              <Sparkles className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm tracking-wide text-gold-soft">
                {firstName ? `Welcome back, ${firstName}.` : "Access unlocked."} Welcome to your
                Sanctuary.
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground/80">
                The header anchors you to book and verse as you stroll.
              </p>
            </div>
          </div>,
          {
            duration: 6500,
            className:
              "border border-gold/35 bg-[rgba(14,14,14,0.92)] backdrop-blur-xl shadow-[0_8px_40px_rgba(201,168,76,0.18)]",
          },
        );
      } else {
        toast(
          <div className="flex items-center gap-2.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold/70" aria-hidden="true" />
            <p className="font-display text-sm tracking-wide text-gold-soft">
              {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
            </p>
          </div>,
          {
            duration: 4000,
            className: "border border-gold/20 bg-[rgba(14,14,14,0.88)] backdrop-blur-xl",
          },
        );
      }
    }, 350);

    return () => window.clearTimeout(handle);
  }, [isReady, rolesLoading, user, roles, displayName]);

  return null;
}
