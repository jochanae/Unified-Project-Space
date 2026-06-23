import { Link, useLocation } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  Compass,
  Crown,
  FileText,
  HelpCircle,
  LogOut,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Star,
  Wallet,
  Share2,
  Upload,
  User as UserIcon,
  X,
} from "lucide-react";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile } from "@/hooks/useProfile";
import { useRoles } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type MenuLink = {
  to: string;
  label: string;
  icon: typeof UserIcon;
  description?: string;
};

type MenuSection = {
  heading: string;
  items: MenuLink[];
};

/**
 * AvatarMenu — "Your Space"
 * Desktop: dropdown anchored to the avatar
 * Mobile:  full-screen sheet
 *
 * Centralised menu for identity, access, settings, support, and sign-out.
 * The avatar trigger renders the user's photo with an Architect crown overlay
 * for admins.
 */
export function AvatarMenu({ className }: { className?: string }) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
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
  const { hasRole } = useRoles(user?.id);
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const name = displayName || fallbackName;
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "S";

  const isAdmin = hasRole("admin");
  const isPatron = !isAdmin && (hasRole("church_partner") || hasRole("minister"));
  const roleLabel = isAdmin ? "Steward" : isPatron ? "Patron" : "Member";
  const roleClass = isAdmin
    ? "border-gold/45 bg-gold/15 text-gold"
    : isPatron
      ? "border-gold/40 bg-transparent text-gold-soft"
      : "border-border/70 bg-muted/20 text-muted-foreground";

  const trigger = (
    <button
      type="button"
      aria-label="Open your space"
      aria-haspopup="menu"
      aria-expanded={open}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian",
        className,
      )}
    >
      <Avatar className="h-12 w-12 border border-gold/35">
        <AvatarImage src={avatarUrl ?? undefined} alt={name} />
        <AvatarFallback className="bg-gold/10 font-display text-xs tracking-[0.2em] text-gold-soft">
          {initials}
        </AvatarFallback>
      </Avatar>
      {isAdmin && (
        <span
          className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-gold/55 bg-obsidian shadow-[0_0_8px_rgba(201,168,76,0.5)]"
          aria-label="Admin"
        >
          <Crown className="h-2.5 w-2.5 text-gold" />
        </span>
      )}
    </button>
  );

  const body = (
    <MenuBody
      name={name}
      email={user.email ?? ""}
      avatarUrl={avatarUrl}
      initials={initials}
      roleLabel={roleLabel}
      roleClass={roleClass}
      isAdmin={isAdmin}
      isPaid={isAdmin || isPatron}
      userId={user.id}
      onClose={() => setOpen(false)}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="right"
          className="w-full sm:max-w-full border-0 bg-obsidian p-0 [&>button]:hidden"
        >
          <div
            className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-gold/15 bg-obsidian/95 px-5 backdrop-blur-md"
            style={{
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)",
              paddingBottom: "12px",
            }}
          >
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Your Space</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-obsidian/80 text-gold shadow-[0_0_12px_rgba(201,168,76,0.35)] hover:border-gold/70 hover:bg-obsidian active:scale-95 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            className="overflow-y-auto overscroll-contain px-5"
            style={{
              maxHeight: "100dvh",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
            }}
          >
            {body}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 max-h-[80vh] overflow-y-auto border-border/60 bg-obsidian/98 backdrop-blur-xl p-0"
      >
        <div className="px-1 py-1">{body}</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─────────────────────────────────────────────────────────────
   MENU BODY (shared between dropdown + sheet)
   ───────────────────────────────────────────────────────────── */

function MenuBody({
  name,
  email,
  avatarUrl,
  initials,
  roleLabel,
  roleClass,
  isAdmin,
  isPaid,
  userId,
  onClose,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
  roleLabel: string;
  roleClass: string;
  isAdmin: boolean;
  isPaid: boolean;
  userId: string;
  onClose: () => void;
}) {
  const { signOut } = useAuth();
  const location = useLocation();
  const onReader = location.pathname.startsWith("/reader");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const journey: MenuSection = {
    heading: "Your Journey",
    items: [
      {
        to: "/reader",
        label: "Open Bible",
        icon: BookOpen,
        description: "Jump back into scripture",
      },
      {
        to: "/journey",
        label: "My Journey",
        icon: Compass,
        description: "Plans, history, progress",
      },
      {
        to: "/notifications",
        label: "Notification Center",
        icon: Bell,
        description: "Recent in-app notifications",
      },
      {
        to: "/saved",
        label: "Saved & Highlights",
        icon: Star,
        description: "Bookmarks, highlights, notes",
      },
      { to: "/notes", label: "Notes", icon: FileText, description: "Your written reflections" },
      {
        to: "/vault",
        label: "The Vault",
        icon: Shield,
        description: "Private archive · Altar saves",
      },
      {
        to: "/finances",
        label: "Stewardship",
        icon: Wallet,
        description: "Tithe, offerings & ledger",
      },
    ],
  };

  const library: MenuSection = {
    heading: "Workspace Library",
    items: [
      {
        to: "/workspace/sermons",
        label: "My Sermons",
        icon: FileText,
        description: "All saved manuscripts",
      },
      {
        to: "/journey",
        label: "Saved Series",
        icon: Calendar,
        description: "Reading plans & sermon series",
      },
    ],
  };

  const access: MenuSection = {
    heading: "Plan & Access",
    items: [
      {
        to: "/account/board",
        label: "Your Board",
        icon: Share2,
        description: "Public sanctuary at @handle",
      },
      {
        to: "/account",
        label: "Subscription",
        icon: Sparkles,
        description: "Manage or upgrade your tier",
      },
      {
        to: "/account/billing",
        label: "Billing",
        icon: Wallet,
        description: "Invoices & payment method",
      },
      { to: "/pricing", label: "Plans & Pricing", icon: Sparkles, description: "Compare tiers" },
    ],
  };

  const settings: MenuSection = {
    heading: "Settings",
    items: [
      {
        to: "/settings",
        label: "All Settings",
        icon: SettingsIcon,
        description: "Hub for every preference",
      },
      {
        to: "/settings/intelligence",
        label: "Selah AI",
        icon: Sparkles,
        description: "Companion behavior",
      },
      {
        to: "/settings/profile",
        label: "Profile",
        icon: UserIcon,
        description: "Name, handle, photo",
      },
      {
        to: "/settings/reading",
        label: "Reading Preferences",
        icon: BookOpen,
        description: "Translation, type, layout",
      },
      {
        to: "/settings/notifications",
        label: "Notification Settings",
        icon: Bell,
        description: "What pings you, when",
      },
      {
        to: "/settings/security",
        label: "Security",
        icon: Shield,
        description: "Password & sessions",
      },
      {
        to: "/settings/service-mode",
        label: "Service Mode",
        icon: Crown,
        description: "Sunday-ready stage view",
      },
      {
        to: "/settings/calendar-sync",
        label: "Calendar Sync",
        icon: Calendar,
        description: "Subscribe in Apple, Google, Outlook",
      },
    ],
  };

  const support: MenuSection = {
    heading: "Support",
    items: [
      { to: "/contact", label: "Help & Feedback", icon: HelpCircle },
      { to: "/faq", label: "FAQ", icon: HelpCircle },
      { to: "/about", label: "About SanctumIQ", icon: Sparkles },
      { to: "/privacy", label: "Privacy", icon: Shield },
      { to: "/terms", label: "Terms", icon: SettingsIcon },
    ],
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: profErr } = await supabase
        .from("profiles")
        .upsert({ id: userId, display_name: name, avatar_url: urlData.publicUrl });
      if (profErr) throw profErr;
      toast.success("Photo updated.");
      // Soft refresh; useProfile will re-fetch on next mount.
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload photo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1 py-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarUpload}
      />

      {/* Identity header */}
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="relative shrink-0 group"
          aria-label="Change photo"
        >
          <Avatar className="h-12 w-12 border border-gold/30">
            <AvatarImage src={avatarUrl ?? undefined} alt={name} />
            <AvatarFallback className="bg-gold/10 font-display text-sm tracking-[0.2em] text-gold-soft">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-obsidian/65 opacity-0 group-hover:opacity-100 transition-opacity">
            <Upload className="h-4 w-4 text-gold-soft" />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base text-gold-soft truncate">{name}</p>
          <p className="text-xs text-muted-foreground/70 truncate">{email}</p>
          <span
            className={cn(
              "mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.25em]",
              roleClass,
            )}
          >
            {roleLabel}
          </span>
        </div>
      </div>

      <Divider />

      {/* Primary action: Go to Workspace — always available, top of menu.
          When the user is on a /reader page, give it an extra glow + pulse so
          it's the obvious next step. */}
      <div className="px-1 py-1">
        <Link
          to="/workspace"
          onClick={onClose}
          aria-current={onReader ? "true" : undefined}
          className={cn(
            "group relative flex items-center justify-between gap-3 rounded-md border px-3 py-3 transition-colors",
            onReader
              ? "border-gold/55 bg-gold/12 shadow-[0_0_0_1px_rgba(201,168,76,0.25),0_0_24px_rgba(201,168,76,0.18)] hover:bg-gold/18"
              : "border-gold/30 bg-gold/5 hover:bg-gold/12",
          )}
        >
          {onReader && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-px rounded-md ring-1 ring-gold/40 animate-pulse"
            />
          )}
          <span className="relative flex items-center gap-3 min-w-0">
            <BookOpen
              className={cn("h-4 w-4 shrink-0", onReader ? "text-gold" : "text-gold")}
              strokeWidth={1.5}
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-display text-sm text-gold-soft">
                Go to Workspace
                {onReader && (
                  <span className="rounded-full border border-gold/45 bg-obsidian px-1.5 py-px text-[9px] uppercase tracking-[0.22em] text-gold">
                    Next
                  </span>
                )}
              </span>
              <span className="block text-[11px] text-muted-foreground/70 truncate">
                Sermons, plans, and study tools
              </span>
            </span>
          </span>
          <ArrowRight className="relative h-4 w-4 text-gold/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </Link>
      </div>
      <Divider />

      {!isPaid && (
        <>
          <div className="px-1 py-1">
            <Link
              to="/pricing"
              onClick={onClose}
              className="group flex items-center justify-between gap-3 rounded-md border border-gold/40 bg-gold/10 px-3 py-3 transition-colors hover:bg-gold/15"
            >
              <span className="flex items-center gap-3 min-w-0">
                <Sparkles className="h-4 w-4 text-gold shrink-0" strokeWidth={1.5} />
                <span className="min-w-0">
                  <span className="block font-display text-sm text-gold-soft">
                    Upgrade your sanctuary
                  </span>
                  <span className="block text-[11px] text-muted-foreground/70 truncate">
                    Architect & Church Partner plans
                  </span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-gold/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          </div>
          <Divider />
        </>
      )}

      <Section section={journey} onSelect={onClose} />
      <Divider />
      {isPaid && (
        <>
          <Section section={library} onSelect={onClose} />
          <Divider />
        </>
      )}
      <Section section={access} onSelect={onClose} />
      <Divider />
      <Section section={settings} onSelect={onClose} />
      <Divider />
      <Section section={support} onSelect={onClose} />

      {isAdmin && (
        <>
          <Divider />
          <Section
            section={{
              heading: "Admin",
              items: [{ to: "/admin", label: "Admin Hub", icon: Crown }],
            }}
            onSelect={onClose}
          />
        </>
      )}

      <Divider />
      <button
        type="button"
        onClick={() => {
          onClose();
          signOut();
        }}
        className="w-full flex items-center gap-3 px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-gold/5 rounded-md transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}

function Section({ section, onSelect }: { section: MenuSection; onSelect: () => void }) {
  return (
    <div className="px-1 py-1">
      <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.28em] text-gold/70">
        {section.heading}
      </p>
      <ul className="space-y-0.5">
        {section.items.map((item) => (
          <li key={`${section.heading}-${item.label}-${item.to}`}>
            <Row item={item} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ item, onSelect }: { item: MenuLink; onSelect: () => void }): ReactNode {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground/90 hover:bg-gold/8 hover:text-gold-soft transition-colors"
    >
      <Icon className="h-4 w-4 text-gold-soft/80 shrink-0" strokeWidth={1.5} />
      <span className="flex-1 min-w-0">
        <span className="block truncate">{item.label}</span>
        {item.description && (
          <span className="block truncate text-[11px] text-muted-foreground/60">
            {item.description}
          </span>
        )}
      </span>
    </Link>
  );
}

function Divider() {
  return <div className="mx-3 h-px bg-border/40" />;
}
