import { Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRoles } from "@/hooks/useRoles";
import { cn } from "@/lib/utils";

export function ReaderHeaderMedallion({
  userId,
  name,
  avatarUrl,
  initials,
}: {
  userId?: string;
  name: string;
  avatarUrl?: string | null;
  initials: string;
}) {
  const { hasAnyRole } = useRoles(userId);
  const isPartnerTier = hasAnyRole(["church_partner", "minister"]);

  return (
    <div className="relative inline-flex items-center gap-2">
      <div
        className={cn(
          "reader-medallion relative flex h-11 w-11 items-center justify-center overflow-hidden border border-gold/35 bg-white/[0.04] shadow-[0_0_24px_rgba(201,168,76,0.16)]",
          isPartnerTier && "reader-medallion-shimmer",
        )}
      >
        <Avatar className="h-8 w-8 border border-gold/20 bg-transparent">
          <AvatarImage src={avatarUrl ?? undefined} alt={name} />
          <AvatarFallback className="bg-gold/12 font-display text-[11px] tracking-[0.18em] text-gold-soft">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
      {isPartnerTier && (
        <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-gold/40 bg-obsidian text-gold shadow-[0_0_16px_rgba(201,168,76,0.22)]">
          <Crown className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}
