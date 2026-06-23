/**
 * LibrarySheetAvatar — Compact auth-aware control for in-sheet account access.
 *
 * Designed to sit inside the header of bottom sheets (Library, Selah) on mobile
 * where the top nav is hidden. Behaviors:
 *  - Signed in: shows avatar; tapping reveals a tiny popover with name,
 *    "Account Settings", and "Sign Out".
 *  - Signed out: shows a small "Sign In" pill linking to /auth.
 */

import { Link } from "@tanstack/react-router";
import { BookOpenCheck, KeyRound, LogOut, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

export function LibrarySheetAvatar({ className }: { className?: string }) {
  const { user, signOut } = useAuth();
  const fallbackName =
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Friend";
  const fallbackAvatar =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null;
  const { displayName, avatarUrl } = useProfile(user?.id, fallbackName, fallbackAvatar);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        to="/auth"
        aria-label="Sign In"
        className={cn(
          "group flex flex-col items-center gap-1 text-gold-soft/80 transition-all duration-300 ease-out hover:text-gold-soft motion-reduce:transition-none",
          className,
        )}
      >
        <span className="flex min-h-9 min-w-9 items-center justify-center rounded-full px-1 transition-all duration-300 ease-out group-hover:bg-gold/8 motion-reduce:transition-none">
          <KeyRound
            className="h-5 w-5 transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none"
            strokeWidth={1.5}
          />
        </span>
        <span className="font-display text-[11px] tracking-[0.08em] text-gold-soft/80">
          Sign In
        </span>
      </Link>
    );
  }

  const name = displayName || fallbackName;
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "S";

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close account menu" : "Open account menu"}
        aria-expanded={open}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold/30 transition-colors hover:border-gold/55"
      >
        <Avatar className="h-7 w-7">
          <AvatarImage src={avatarUrl ?? undefined} alt={name} />
          <AvatarFallback className="bg-gold/12 font-display text-[10px] tracking-[0.18em] text-gold-soft">
            {initials}
          </AvatarFallback>
        </Avatar>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-[60] w-56 overflow-hidden rounded-xl border border-gold/22 bg-[rgba(14,14,14,0.96)] shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-2.5 border-b border-gold/12 px-3 py-2.5">
            <Avatar className="h-8 w-8 border border-gold/25">
              <AvatarImage src={avatarUrl ?? undefined} alt={name} />
              <AvatarFallback className="bg-gold/12 font-display text-[10px] tracking-[0.18em] text-gold-soft">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-display text-sm text-gold-soft">{name}</p>
              <p className="truncate text-[10px] text-muted-foreground/70">{user.email}</p>
            </div>
          </div>

          <Link
            to="/workspace"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-2.5 border-b border-gold/12 bg-gold/[0.04] px-3 py-2.5 text-xs text-gold-soft transition-colors hover:bg-gold/10 hover:text-gold"
          >
            <BookOpenCheck className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
            Go to Workspace
          </Link>

          <Link
            to="/account"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-foreground/85 transition-colors hover:bg-gold/8 hover:text-gold-soft"
          >
            <SettingsIcon className="h-3.5 w-3.5 text-gold-soft/70" strokeWidth={1.5} />
            Account Settings
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="flex w-full items-center gap-2.5 border-t border-gold/12 px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-gold/8 hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
