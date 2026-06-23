import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { cn } from "@/lib/utils";

export function RoleIdentity({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { hasRole } = useRoles(user?.id);

  if (!user) return null;

  const name =
    (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "Friend";
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ||
    (user.user_metadata?.picture as string | undefined) ||
    undefined;
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "S";
  const isArchitect = hasRole("admin");
  const isPatron = !isArchitect && (hasRole("church_partner") || hasRole("minister"));
  const badgeLabel = isArchitect ? "Steward" : isPatron ? "Patron" : "Member";
  const badgeClassName = isArchitect
    ? "border-gold/40 bg-gold/15 text-gold-soft"
    : isPatron
      ? "border-gold/45 bg-transparent text-gold-soft shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--gold)_32%,transparent)]"
      : "border-border/80 bg-muted/20 text-muted-foreground";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-border/70 bg-background/30",
        compact ? "px-2.5 py-2" : "px-3 py-2",
      )}
    >
      <Avatar className={cn("border border-gold/25", compact ? "h-9 w-9" : "h-10 w-10")}>
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback className="bg-gold/10 font-display text-sm tracking-[0.24em] text-gold-soft">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className={cn("truncate text-foreground", compact ? "text-xs" : "text-sm")}>
          <span className={cn("font-display text-gold-soft", compact ? "text-sm" : "text-base")}>
            {name}
          </span>
        </p>
        <Badge
          variant="outline"
          className={cn(
            "mt-1 w-fit border text-[10px] uppercase tracking-[0.28em]",
            badgeClassName,
          )}
        >
          {badgeLabel}
        </Badge>
      </div>
    </div>
  );
}
