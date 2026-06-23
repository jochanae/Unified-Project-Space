import { motion } from 'framer-motion';
import { Heart, Users, Sparkles, ChevronDown } from 'lucide-react';
import type { Connection } from '@/hooks/useProfile';
import CompanionImageReveal from '@/components/CompanionImageReveal';
import ResilientImage from '@/components/ResilientImage';
import CompanionPropContainer from '@/components/CompanionPropContainer';
import type { ActiveProp } from '@/hooks/useActiveProps';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const BOND_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'New Bond', color: 'text-muted-foreground' },
  2: { label: 'Growing Bond', color: 'text-primary' },
  3: { label: 'Trusted Ally', color: 'text-accent' },
  4: { label: 'Deep Connection', color: 'text-primary' },
};

const MODE_LABELS: Record<string, string> = {
  friend: '🤝 Friend',
  romantic: '💕 Partner',
  mentor: '🧭 Mentor',
  personal: '✨ Personal',
  abstract: '🎨 Abstract',
};

interface CompanionHeroProps {
  companion: Connection;
  allCompanions: Connection[];
  onSwitch: (memberId: string) => void;
  currentProp?: ActiveProp | null;
  propCount?: number;
}

export default function CompanionHero({ companion, allCompanions, onSwitch, currentProp = null, propCount = 0 }: CompanionHeroProps) {
  const bond = BOND_LABELS[companion.relationshipLevel || 1] || BOND_LABELS[1];
  const mode = MODE_LABELS[companion.connectionMode || ''] || null;
  const traits = companion.personality?.split(',').map(t => t.trim()).filter(Boolean).slice(0, 2) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 py-5 border-b border-border/20"
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative h-16 w-16 shrink-0">
          <div className="h-16 w-16 rounded-2xl overflow-hidden bg-muted border-2 border-primary/20 shadow-lg">
            {companion.avatarUrl ? (
              <CompanionImageReveal
                src={companion.avatarUrl}
                alt={companion.name}
                simpleFade
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center gradient-primary text-primary-foreground font-bold text-xl">
                {companion.name.charAt(0)}
              </div>
            )}
          </div>
          {/* Live prop */}
          <CompanionPropContainer currentProp={currentProp} propCount={propCount} />
          {/* Bond indicator dot */}
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border shadow-sm">
            <Heart className={`h-3 w-3 ${bond.color} ${(companion.relationshipLevel || 1) >= 3 ? 'fill-current' : ''}`} />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {allCompanions.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 font-serif text-lg font-bold text-foreground hover:text-primary transition-colors">
                  {companion.name}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {allCompanions.map(c => (
                    <DropdownMenuItem
                      key={c.memberId}
                      onClick={() => onSwitch(c.memberId)}
                      className={c.memberId === companion.memberId ? 'bg-accent' : ''}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full overflow-hidden bg-muted shrink-0">
                          {c.avatarUrl ? (
                            <ResilientImage
                              src={c.avatarUrl}
                              alt={c.name}
                              wrapperClassName="h-full w-full rounded-full"
                              className="object-cover rounded-full"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center gradient-primary text-primary-foreground text-[10px] font-bold">
                              {c.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        {c.name}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <h2 className="font-serif text-lg font-bold text-foreground">{companion.name}</h2>
            )}
          </div>

          {/* Mode + Bond */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {mode && (
              <span className="text-[11px] text-muted-foreground">{mode}</span>
            )}
            <span className={`text-[11px] font-medium ${bond.color} flex items-center gap-1`}>
              <Heart className={`h-2.5 w-2.5 ${(companion.relationshipLevel || 1) >= 3 ? 'fill-current' : ''}`} />
              {bond.label}
            </span>
          </div>

          {/* Traits */}
          {traits.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {traits.map((trait, i) => (
                <span
                  key={i}
                  className="rounded-full bg-secondary/60 border border-border/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {trait}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
