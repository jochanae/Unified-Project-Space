import { cn } from '@/lib/utils';
import { AVATAR_PRESETS, CARD_DESIGNS, type KidProfile } from '@/hooks/useKidProfile';

interface KidCardProps {
  profile: KidProfile;
  showBalance?: boolean;
  balance?: number;
  className?: string;
}

export function KidCard({ profile, showBalance, balance, className }: KidCardProps) {
  const card = CARD_DESIGNS.find(c => c.id === profile.card_design) || CARD_DESIGNS[0];
  const avatar = AVATAR_PRESETS.find(a => a.id === profile.avatar_preset) || AVATAR_PRESETS[0];

  return (
    <div className={cn(
      'w-full max-w-xs h-48 rounded-2xl p-5 flex flex-col justify-between text-white shadow-xl bg-gradient-to-br select-none',
      card.gradient,
      className
    )}>
      <div className="flex justify-between items-start">
        <span className="text-3xl drop-shadow-lg">{avatar.emoji}</span>
        <span className="text-sm font-bold tracking-widest opacity-90">IntoIQ</span>
      </div>
      <div>
        {showBalance && balance !== undefined ? (
          <p className="text-2xl font-bold tabular-nums drop-shadow">
            ${balance.toFixed(2)}
          </p>
        ) : (
          <p className="text-lg font-medium opacity-70">• • • •</p>
        )}
        <p className="text-xs opacity-80 uppercase tracking-wider mt-0.5">Explorer Card</p>
        <div className="flex justify-between items-end">
          <p className="text-lg font-bold truncate max-w-[60%]">{profile.display_name}</p>
          <p className="text-sm opacity-70">{card.pattern}</p>
        </div>
      </div>
    </div>
  );
}
