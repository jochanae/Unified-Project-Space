import React, { useState } from 'react';
import SmartCard from './SmartCard';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface RecipeCardProps {
  title: string;
  ingredients: string[];
  steps: string[];
  onSave?: () => void;
  onMarkMade?: () => void;
}

const COLLAPSED_INGREDIENTS = 6;
const COLLAPSED_STEPS = 4;

const RecipeCard: React.FC<RecipeCardProps> = ({ title, ingredients, steps, onSave, onMarkMade }) => {
  const [tab, setTab] = useState<'ingredients' | 'steps'>('ingredients');
  const [expanded, setExpanded] = useState(false);

  const hasMoreIngredients = ingredients.length > COLLAPSED_INGREDIENTS;
  const hasMoreSteps = steps.length > COLLAPSED_STEPS;
  const canExpand = tab === 'ingredients' ? hasMoreIngredients : hasMoreSteps;

  const visibleIngredients = expanded ? ingredients : ingredients.slice(0, COLLAPSED_INGREDIENTS);
  const visibleSteps = expanded ? steps : steps.slice(0, COLLAPSED_STEPS);

  return (
    <SmartCard type="recipe">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <div className="flex gap-4 mt-2 border-b border-white/10">
        {(['ingredients', 'steps'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setExpanded(false); }}
            className={cn(
              'pb-1.5 text-[11px] font-medium capitalize transition-colors',
              tab === t ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground/60 hover:text-muted-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className={cn('mt-2 overflow-y-auto transition-all duration-300', expanded ? 'max-h-[400px]' : 'max-h-32')}>
        {tab === 'ingredients' ? (
          <ul className="space-y-0.5">
            {visibleIngredients.map((item, i) => (
              <li key={i} className="text-[12px] text-muted-foreground before:content-['•'] before:mr-1.5 before:text-muted-foreground/40">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <ol className="space-y-1">
            {visibleSteps.map((step, i) => (
              <li key={i} className="text-[12px] text-muted-foreground">
                <span className="text-primary/50 font-medium mr-1.5">{i + 1}.</span>{step}
              </li>
            ))}
          </ol>
        )}
      </div>
      {canExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-1.5 text-[11px] text-primary/60 hover:text-primary transition-colors"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show all {tab === 'ingredients' ? `${ingredients.length} ingredients` : `${steps.length} steps`}</>}
        </button>
      )}
      <div className="flex items-center gap-4 mt-3">
        {onSave && (
          <button onClick={onSave} className="text-[11px] text-primary/60 hover:text-primary transition-colors">
            Save recipe
          </button>
        )}
        {onMarkMade && (
          <button onClick={onMarkMade} className="text-[11px] text-primary/60 hover:text-primary transition-colors">
            Mark as made ✓
          </button>
        )}
      </div>
    </SmartCard>
  );
};

export default RecipeCard;
