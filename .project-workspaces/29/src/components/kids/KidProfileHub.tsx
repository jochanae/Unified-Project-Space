import { Plus, Crown, Lock, Sparkles, Star, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AVATAR_PRESETS, CARD_DESIGNS, type KidProfile } from '@/hooks/useKidProfile';

interface KidProfileHubProps {
  profiles: KidProfile[];
  canAddMore: boolean;
  onSelect: (profileId: string) => void;
  onAddNew: () => void;
  onUpgrade: () => void;
}

export function KidProfileHub({ profiles, canAddMore, onSelect, onAddNew, onUpgrade }: KidProfileHubProps) {
  const hasProfiles = profiles.length > 0;

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';

  return (
    <div className="min-h-[60vh] flex flex-col items-center px-4 pt-4">
      {/* Greeting header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          IntoIQ Youth
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-2">
          <span className="gradient-text">
            {hasProfiles ? `${greeting}! ${greetingEmoji}` : 'Welcome to Youth Mode!'}
          </span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          {hasProfiles
            ? "Who's ready to learn about money today?"
            : 'Create your first profile to begin your money adventure!'}
        </p>
      </div>

      {/* Profile cards */}
      <div className={cn(
        'grid gap-4 md:gap-6 max-w-2xl w-full mb-6',
        profiles.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2'
      )}>
        {profiles.map(profile => {
          const avatar = AVATAR_PRESETS.find(a => a.id === profile.avatar_preset) || AVATAR_PRESETS[0];
          const card = CARD_DESIGNS.find(c => c.id === profile.card_design) || CARD_DESIGNS[0];

          return (
            <button
              key={profile.id}
              onClick={() => onSelect(profile.id)}
              className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border/50 bg-card hover:border-primary hover:shadow-xl transition-all duration-300 hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <div className={cn(
                'h-24 w-24 rounded-full flex items-center justify-center text-5xl shadow-lg bg-gradient-to-br transition-transform group-hover:scale-110 group-hover:rotate-3',
                card.gradient
              )}>
                {avatar.emoji}
              </div>
              <span className="font-bold text-xl truncate max-w-full">{profile.display_name}</span>
              <span className="text-sm text-muted-foreground">{card.pattern}</span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <BookOpen className="h-3 w-3" />
                Tap to enter
              </div>
            </button>
          );
        })}
      </div>

      {/* Add Child - separate section */}
      <button
        onClick={canAddMore ? onAddNew : onUpgrade}
        className={cn(
          'flex items-center gap-3 px-5 py-3 rounded-full border-2 border-dashed transition-all duration-300 focus:outline-none mb-4',
          canAddMore
            ? 'border-muted-foreground/30 hover:border-primary hover:bg-primary/5 cursor-pointer'
            : 'border-muted-foreground/20 hover:border-gold/50 cursor-pointer'
        )}
        title={canAddMore ? 'Add a child' : 'Upgrade to Pro for unlimited kids'}
      >
        {canAddMore ? (
          <>
            <Plus className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-muted-foreground text-sm">Add another child</span>
          </>
        ) : (
          <>
            <Crown className="h-4 w-4 text-gold" />
            <span className="font-medium text-muted-foreground text-sm">Add more kids</span>
            <span className="text-xs text-gold font-semibold px-2 py-0.5 rounded-full bg-gold/10">Pro</span>
          </>
        )}
      </button>

      {/* Fun tip at bottom */}
      {hasProfiles && (
        <div className="max-w-md w-full mt-4 px-4 py-3 rounded-xl bg-muted/40 border border-border/30 text-center">
          <p className="text-xs text-muted-foreground">
            <Star className="h-3 w-3 text-gold inline mr-1" />
            Tip: Each child has their own piggy bank, trades, and achievements!
          </p>
        </div>
      )}
    </div>
  );
}
