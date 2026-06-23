import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import {
  BookOpen,
  Compass,
  ChevronLeft,
  Crown,
  Heart,
  KeyRound,
  Lock,
  NotebookPen,
  Search,
  Sparkles,
  Sunrise,
} from "lucide-react";
import React, { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  MasterHeader,
  MasterHeaderDefaultRight,
  MasterHeaderIconButton,
} from "@/components/layout/MasterHeader";
import { useQuickSearch } from "@/components/QuickSearchProvider";
import { useDailyWord } from "@/components/reader/DailyWordProvider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useProfile } from "@/hooks/useProfile";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AvatarMenu } from "@/components/layout/AvatarMenu";

import { ServiceModeBadge } from "@/components/layout/ServiceModeBadge";
import { OfflineBadge } from "@/components/layout/OfflineBadge";
import { SelahChatSurface } from "@/components/selah/SelahChatSurface";
import { ThemeToggleButton } from "@/components/layout/ThemeToggleButton";
import { useStudyCircuit } from "@/hooks/useStudyCircuit";

const desktopNavItems = [
  { to: "/reader", label: "Read", icon: BookOpen },
  { to: "/search", label: "Search", icon: Search },
  { to: "/notes", label: "Reflect", icon: NotebookPen },
  { to: "/vault", label: "Vault", icon: Lock },
  { to: "/journey", label: "Journey", icon: Compass },
  { to: "/workspace", label: "Prepare", icon: Sparkles },
  { to: "/admin", label: "Admin", icon: Crown },
] as const;

const mobileNavItems = [
  { to: "/reader", label: "Read", icon: BookOpen },
  { to: "/notes", label: "Reflect", icon: NotebookPen },
  { to: "/journey", label: "Journey", icon: Compass },
  { to: "/workspace", label: "Prepare", icon: Sparkles },
] as const;

const mobileAdminNavItems = [
  ...mobileNavItems,
  { to: "/admin", label: "Admin", icon: Crown },
] as const;

const publicNavItems = [
  { to: "/reader", label: "Read", icon: BookOpen },
  { to: "/pricing", label: "Plans", icon: Crown },
  { to: "/auth", label: "Sign In", icon: KeyRound },
] as const;

const plansNavItem = { to: "/pricing", label: "Plans", icon: Crown } as const;

function getVisibleDesktopNavItems(isAuthenticated: boolean, isPaid: boolean) {
  if (!isAuthenticated) return publicNavItems;
  // Free authenticated users: show "Plans" so the upgrade path is always one click away.
  return isPaid ? desktopNavItems : [...desktopNavItems, plansNavItem];
}

function getVisibleMobileNavItems(isAuthenticated: boolean, isAdmin: boolean) {
  if (!isAuthenticated) return publicNavItems;
  return isAdmin ? mobileAdminNavItems : mobileNavItems;
}

function isNavItemActive(currentPath: string, to: string) {
  return to === "/" ? currentPath === "/" : currentPath.startsWith(to);
}

function handleReaderIntent(event: MouseEvent<HTMLAnchorElement>, currentPath: string, to: string) {
  if (to !== "/reader" || !currentPath.startsWith("/reader")) return;
  event.preventDefault();
  window.dispatchEvent(new CustomEvent("reader:open-picker"));
}

export function AppShell({
  children,
  hideTopNav = false,
  pageTitle,
  bottomNavClassName,
}: {
  children: ReactNode;
  hideTopNav?: boolean;
  pageTitle?: string;
  bottomNavClassName?: string;
}) {
  const location = useLocation();
  const path = location.pathname;
  // Hydrate Study Circuit from the cloud on app load so the user resumes
  // their last verse on any device, regardless of which route they open first.
  useStudyCircuit();

  return (
    <div className="min-h-screen flex flex-col bg-obsidian text-foreground">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {!hideTopNav &&
        (pageTitle ? <InnerPageMasterHeader title={pageTitle} /> : <TopNav currentPath={path} />)}
      <main
        id="main-content"
        tabIndex={-1}
        className={cn("flex-1 pb-24 md:pb-0", pageTitle && "pt-14 sm:pt-16 md:pt-[4.75rem]")}
      >
        {children}
      </main>
      <BottomTabBar currentPath={path} className={bottomNavClassName} />
    </div>
  );
}

function InnerPageMasterHeader({ title }: { title: string }) {
  const { open: openDailyWord } = useDailyWord();
  const { setOpen: setQuickSearchOpen } = useQuickSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const handleSmartBack = useCallback(() => {
    // History-aware: prefer real back when there's somewhere to return to,
    // otherwise glide home so cold loads / shared deep links never strand.
    const canGoBack =
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer !== "" &&
      !document.referrer.includes(window.location.pathname);
    if (canGoBack) {
      router.history.back();
    } else {
      navigate({ to: "/" });
    }
  }, [navigate, router]);
  const [hasUnread, setHasUnread] = useState(false);

  // Check for unread notifications
  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null)
      .then(({ count }) => setHasUnread((count ?? 0) > 0));
  }, [user]);

  return (
    <MasterHeader
      left={
        <>
          <MasterHeaderIconButton icon={ChevronLeft} label="Go back" onClick={handleSmartBack} />
          <MasterHeaderIconButton
            icon={Search}
            label="Search scripture"
            onClick={() => setQuickSearchOpen(true)}
          />
          {/* Notification dot — same position as reader's recent-locations dot */}
          <button
            type="button"
            onClick={() => navigate({ to: "/notifications" })}
            aria-label="Notifications"
            className="group relative inline-flex h-11 w-9 sm:h-10 sm:w-10 md:h-9 md:w-9 shrink-0 items-center justify-center"
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-block h-2 w-2 rounded-full transition-all duration-300 group-hover:scale-125",
                hasUnread
                  ? "bg-gold shadow-[0_0_10px_rgba(201,168,76,0.65)] animate-pulse"
                  : "bg-gold/25 shadow-none",
              )}
            />
          </button>
        </>
      }
      title={
        <span className="block truncate font-display text-base italic tracking-wide text-foreground/95 sm:text-lg">
          {title}
        </span>
      }
      right={<MasterHeaderDefaultRight onDailyWordClick={openDailyWord} />}
    />
  );
}

function TopNav({ currentPath }: { currentPath: string }) {
  const { user, isReady } = useAuth();
  const { hasAnyRole } = useRoles(user?.id);
  const isPaid = hasAnyRole(["minister", "church_partner", "admin"]);
  const visibleNavItems = getVisibleDesktopNavItems(Boolean(user), isPaid);

  return (
    <header
      className="sticky top-0 z-40 hairline-b bg-obsidian/85 backdrop-blur-md rounded-b-2xl overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link
          to="/"
          aria-label="SanctumIQ home"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center"
        >
          <img
            src="/sanctum-seal.svg"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 opacity-90"
            style={{ filter: "drop-shadow(0 0 6px rgba(201,168,76,0.3))" }}
          />
        </Link>
        <div className="hidden md:block w-6" aria-hidden="true" />

        <nav className="hidden md:flex items-center gap-1">
          <div
            className={cn(
              "flex items-center gap-1 transition-opacity duration-300 ease-in-out",
              isReady ? "opacity-100" : "opacity-0",
            )}
          >
            {visibleNavItems.map((item) => {
              const active = isNavItemActive(currentPath, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={(event) => handleReaderIntent(event, currentPath, item.to)}
                  className={cn(
                    "px-4 py-2 text-sm tracking-wide transition-colors relative",
                    active ? "text-gold-soft" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                  {active && <span className="absolute left-4 right-4 -bottom-px h-px bg-gold" />}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggleButton />
          {isReady ? (
            <div className="transition-opacity duration-300 ease-in-out opacity-100">
              <AuthControls />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center">
              <LoadingSpinner context="button" className="scale-[0.55]" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function BottomTabBar({ currentPath, className }: { currentPath: string; className?: string }) {
  const { user } = useAuth();
  const [selahOpen, setSelahOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const effectiveUser = hydrated ? user : null;

  const leftItems = effectiveUser
    ? ([
        { to: "/reader", label: "Read", icon: BookOpen },
        { to: "/notes", label: "Reflect", icon: NotebookPen },
      ] as const)
    : ([{ to: "/reader", label: "Read", icon: BookOpen }] as const);

  const rightItems = effectiveUser
    ? ([
        { to: "/journey", label: "Journey", icon: Compass },
        { to: "/workspace", label: "Prepare", icon: Sparkles },
      ] as const)
    : ([{ to: "/auth", label: "Sign In", icon: KeyRound }] as const);

  return (
    <>
      {/* Service Mode pill — visible on every page when active */}
      <ServiceModeBadge />
      {/* Offline / sync pill — only when offline or queue draining */}
      <OfflineBadge />

      {/* Selah Chat — opens from center button */}
      {selahOpen && <SelahChatSurface onClose={() => setSelahOpen(false)} />}

      {/*
        Notched bottom bar:
        - The bar itself uses a CSS radial-gradient mask to cut a true
          semicircular hole at top-center. Content scrolling behind it shows
          through that gap — that's the "crack of movement" effect.
        - The Selah button is positioned absolutely above the bar, nestled
          into the notch.
      */}
      <div
        className={cn(
          "md:hidden fixed bottom-0 inset-x-0 z-40 transition-all duration-300 ease-in-out",
          className,
        )}
      >
        {/* Floating Selah button — sits above the notch, outside the masked bar */}
        <button
          type="button"
          onClick={() => setSelahOpen(true)}
          aria-label="Open Selah"
          className="absolute left-1/2 -translate-x-1/2 z-[41] flex flex-col items-center pointer-events-auto"
          style={{ bottom: `calc(env(safe-area-inset-bottom) + 22px)`, gap: "14px" }}
        >
          <span
            className={cn(
              "selah-signet relative flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-300 active:scale-95",
            )}
            style={{
              background: "#0a0a0a",
              boxShadow:
                "inset 0 0 0 1px rgba(201,168,76,0.65), inset 0 1px 0 0 rgba(255,255,255,0.04), 0 0 18px rgba(201,168,76,0.25), 0 0 0 2px oklch(0.21 0 0)",
            }}
          >
            <img
              src="/sanctum-seal.svg"
              alt=""
              aria-hidden="true"
              className="h-7 w-7 -translate-y-[1px] opacity-95"
              style={{ filter: "drop-shadow(0 0 6px rgba(201,168,76,0.35))" }}
            />
          </span>
          <span className="font-display text-[11px] tracking-[0.08em] text-gold">Selah</span>
        </button>

        {/* Masked bar — radial gradient cuts a true notch out of it.
            Background is intentionally translucent (rgba ~20%) + heavy blur so
            the scene behind the bar is visible through it. This is the
            "floating above content" effect (matches Compani's AppFooterBar). */}
        <nav
          data-bottom-tab-bar
          className="rounded-t-2xl border-t border-white/10 shadow-[0_-4px_24px_-2px_rgba(0,0,0,0.35)]"
          style={{
            background: "rgba(0,0,0,0.2)",
            backdropFilter: "blur(20px) saturate(140%)",
            WebkitBackdropFilter: "blur(20px) saturate(140%)",
            paddingBottom: "env(safe-area-inset-bottom)",
            WebkitMaskImage:
              "radial-gradient(circle 40px at 50% 0px, transparent 38px, black 39px)",
            maskImage: "radial-gradient(circle 40px at 50% 0px, transparent 38px, black 39px)",
          }}
        >
          {/* Hairline top — split around the center notch */}
          <div
            aria-hidden
            className="absolute top-0 inset-x-0 h-px"
            style={{
              background:
                "linear-gradient(to right, oklch(0.74 0.115 85 / 0.2) 30%, transparent 40%, transparent 60%, oklch(0.74 0.115 85 / 0.2) 70%)",
            }}
          />

          <div className="relative flex items-end">
            {/* LEFT items */}
            <ul className="flex flex-1">
              {leftItems.map((item) => (
                <NavItem key={item.to} item={item} currentPath={currentPath} />
              ))}
            </ul>

            {/* CENTER spacer — keeps the notch clear */}
            <div className="shrink-0" style={{ width: 80 }} />

            {/* RIGHT items */}
            <ul className="flex flex-1 justify-end">
              {rightItems.map((item) => (
                <NavItem key={item.to} item={item} currentPath={currentPath} />
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </>
  );
}

function NavItem({
  item,
  currentPath,
}: {
  item: {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  };
  currentPath: string;
}) {
  const Icon = item.icon;
  const active = isNavItemActive(currentPath, item.to);
  return (
    <li className="flex-1">
      <Link
        to={item.to}
        onClick={(event) => handleReaderIntent(event, currentPath, item.to)}
        className={cn(
          "group flex flex-col items-center gap-1.5 py-3 w-full transition-all duration-300 ease-out motion-reduce:transition-none",
          active ? "text-gold" : "text-gold-soft/70 hover:-translate-y-0.5 hover:text-gold-soft",
        )}
      >
        <span
          data-tab-icon-halo={active ? "active" : "inactive"}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ease-out motion-reduce:transition-none",
            active
              ? "bg-gold/12 text-gold shadow-[0_0_18px_rgba(201,168,76,0.18)] -translate-y-0.5"
              : "bg-transparent text-current group-hover:bg-gold/8",
          )}
        >
          <Icon
            className="h-5 w-5 transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none"
            strokeWidth={active ? 2 : 1.5}
          />
        </span>
        <span
          className={cn(
            "font-display text-[11px] tracking-[0.08em]",
            active ? "text-gold" : "text-gold-soft/80",
          )}
        >
          {item.label}
        </span>
      </Link>
    </li>
  );
}

export function PublicBottomTabBar({ currentPath }: { currentPath: string }) {
  const { user } = useAuth();
  const fallbackName =
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Member";
  const fallbackAvatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null;
  const { avatarUrl } = useProfile(user?.id, fallbackName, fallbackAvatarUrl);

  // When signed in, hide the "Sign In" key item — the Member avatar already
  // proves the user has an account. Only show Sign In to anonymous visitors.
  const visibleItems = user ? publicNavItems.filter((item) => item.to !== "/auth") : publicNavItems;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 hairline-t bg-obsidian-elevated/95 backdrop-blur-lg rounded-t-2xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul
        className={cn(
          "flex items-end justify-around",
          visibleItems.length === 2 && "mx-auto max-w-[15rem] justify-between px-10",
        )}
      >
        {visibleItems.map((item, index) => {
          const isAccountSlot = index === 1;
          const Icon = item.icon;
          const to = isAccountSlot && user ? "/account" : item.to;
          const label = isAccountSlot && user ? "Member" : item.label;
          const active = isNavItemActive(currentPath, to);
          const profileGlyph = user ? (
            avatarUrl ? (
              <Avatar className="h-12 w-12 border border-gold/35 ring-1 ring-black/40">
                <AvatarImage src={avatarUrl} alt={fallbackName} />
                <AvatarFallback className="bg-gold/10 font-display text-xs text-gold-soft">
                  {fallbackName.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold/35 bg-gold/10 font-display text-sm text-gold-soft">
                {fallbackName.slice(0, 1).toUpperCase()}
              </span>
            )
          ) : null;

          return (
            <li key={to} className="flex justify-center">
              <Link
                to={to}
                className={cn(
                  "group flex flex-col items-center justify-end gap-1.5 py-3 transition-all duration-300 ease-out motion-reduce:transition-none",
                  active
                    ? "text-gold"
                    : "text-gold-soft/70 hover:-translate-y-0.5 hover:text-gold-soft",
                )}
              >
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ease-out motion-reduce:transition-none",
                    active && !(isAccountSlot && user)
                      ? "bg-gold/12 text-gold shadow-[0_0_18px_rgba(201,168,76,0.18)] -translate-y-0.5"
                      : "bg-transparent text-current group-hover:bg-gold/8",
                  )}
                >
                  {isAccountSlot && user ? (
                    profileGlyph
                  ) : (
                    <Icon
                      className="h-[1.875rem] w-[1.875rem] transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none"
                      strokeWidth={active ? 1.75 : 1.5}
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "font-display text-[11px] tracking-[0.08em]",
                    active ? "text-gold" : "text-gold-soft/80",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AuthControls() {
  const { user } = useAuth();
  if (!user) return null;
  return <AvatarMenu />;
}

/* SelahSheet was replaced by SelahChatSurface — see src/components/selah/SelahChatSurface.tsx */
