import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Crown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AVATAR_PRESETS, CARD_DESIGNS, MAX_FREE_KIDS, type KidProfile } from '@/hooks/useKidProfile';
import { useAuth } from '@/contexts/AuthContext';

interface KidProfileSelectorProps {
  profiles: KidProfile[];
  selectedProfileId: string | null;
  onSelect: (profileId: string) => void;
  onAddNew: () => void;
}

export function KidProfileSelector({ profiles, selectedProfileId, onSelect, onAddNew }: KidProfileSelectorProps) {
  const { subscriptionTier } = useAuth();
  const isPro = subscriptionTier === 'pro';
  const canAddMore = isPro || profiles.length < MAX_FREE_KIDS;

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {profiles.map(profile => {
        const avatar = AVATAR_PRESETS.find(a => a.id === profile.avatar_preset) || AVATAR_PRESETS[0];
        const card = CARD_DESIGNS.find(c => c.id === profile.card_design) || CARD_DESIGNS[0];
        const isSelected = profile.id === selectedProfileId;

        return (
          <button
            key={profile.id}
            onClick={() => onSelect(profile.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all whitespace-nowrap min-w-fit',
              isSelected
                ? 'border-primary bg-primary/10 shadow-md scale-105'
                : 'border-transparent bg-muted/50 hover:bg-muted hover:scale-102'
            )}
          >
            <span className="text-xl">{avatar.emoji}</span>
            <span className={cn('font-medium text-sm', isSelected && 'text-primary')}>
              {profile.display_name}
            </span>
          </button>
        );
      })}

      {/* Add child button */}
      <button
        onClick={canAddMore ? onAddNew : undefined}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full border-2 border-dashed transition-all whitespace-nowrap min-w-fit',
          canAddMore
            ? 'border-muted-foreground/30 hover:border-primary hover:bg-primary/5 cursor-pointer'
            : 'border-muted-foreground/20 opacity-60 cursor-not-allowed'
        )}
        title={canAddMore ? 'Add another child' : 'Upgrade to Pro for unlimited kids'}
      >
        {canAddMore ? (
          <Plus className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Lock className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm text-muted-foreground">
          {canAddMore ? 'Add Child' : 'Pro'}
        </span>
        {!canAddMore && <Crown className="h-3 w-3 text-gold" />}
      </button>
    </div>
  );
}
