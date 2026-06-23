import React from 'react';
import { Globe, Drama, CookingPot, HelpCircle, Lightbulb, Heart, Repeat, BookOpen, Compass, Zap } from 'lucide-react';

export interface CardRequestOption {
  emoji: string;
  label: string;
  prompt: string;
  icon: React.ElementType;
  cardType: 'language' | 'practice' | 'recipe' | 'decision' | 'knowledge' | 'reflection' | 'habit' | 'memory' | 'discovery' | 'blueprint';
  strategicOnly?: boolean;
}

export const cardRequestOptions: CardRequestOption[] = [
  {
    emoji: '🌐',
    label: 'Translate',
    prompt: 'Can you teach me how to say something in ',
    icon: Globe,
    cardType: 'language',
  },
  {
    emoji: '🎭',
    label: 'Rehearse',
    prompt: 'Help me practice a conversation where I need to ',
    icon: Drama,
    cardType: 'practice',
  },
  {
    emoji: '🍳',
    label: 'Recipe',
    prompt: 'Give me a recipe for ',
    icon: CookingPot,
    cardType: 'recipe',
  },
  {
    emoji: '🤔',
    label: 'Decide',
    prompt: 'Help me decide between ',
    icon: HelpCircle,
    cardType: 'decision',
  },
  {
    emoji: '💡',
    label: 'Tip',
    prompt: 'Give me a useful tip or insight about ',
    icon: Lightbulb,
    cardType: 'knowledge',
  },
  {
    emoji: '🪞',
    label: 'Reflect',
    prompt: 'Ask me a thoughtful reflection question about ',
    icon: Heart,
    cardType: 'reflection',
  },
  {
    emoji: '🔄',
    label: 'Habit',
    prompt: 'Check in on my progress with ',
    icon: Repeat,
    cardType: 'habit',
  },
  {
    emoji: '📖',
    label: 'Remember',
    prompt: 'Recall something we talked about related to ',
    icon: BookOpen,
    cardType: 'memory',
  },
  {
    emoji: '🔮',
    label: 'Discover',
    prompt: 'Help me discover my ',
    icon: Compass,
    cardType: 'discovery',
  },
  {
    emoji: '⚡',
    label: 'Blueprint',
    prompt: 'Give me a blueprint for ',
    icon: Zap,
    cardType: 'blueprint',
    strategicOnly: true,
  },
];

interface CardRequestMenuProps {
  onSelect: (prompt: string, cardType: string) => void;
  onClose: () => void;
  activeCardType?: string | null;
  situationalMode?: string | null;
}

const CardRequestMenu: React.FC<CardRequestMenuProps> = ({ onSelect, onClose, activeCardType, situationalMode }) => {
  const isStrategic = situationalMode === 'strategic';
  return (
    <div className="flex flex-col gap-0.5 py-1">
      {cardRequestOptions.map((opt) => {
        const isHighlighted = opt.cardType === 'blueprint' && isStrategic;
        return (
          <button
            key={opt.label}
            onClick={() => {
              onSelect(opt.prompt, opt.cardType);
              onClose();
            }}
            className={`flex items-center gap-2.5 px-3 py-2 text-left rounded-lg hover:bg-white/[0.08] transition-colors group ${
              activeCardType === opt.cardType ? 'ring-1 ring-primary/40 bg-primary/10' : ''
            } ${
              isHighlighted ? 'ring-1 ring-[rgba(212,175,55,0.45)] bg-[rgba(212,175,55,0.06)]' : ''
            }`}
          >
            <span className="text-base">{opt.emoji}</span>
            <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{opt.label}</p>
              {isHighlighted && (
                <span className="text-[9px] font-semibold tracking-[0.14em] text-[rgba(212,175,55,0.85)]">
                  ACTIVE
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default CardRequestMenu;
