/**
 * EnergyGenderSelector — Shared selector for gender presentation and energy/age vibe.
 * Used across FirstMoment, Studio creation, and Browse connect flows.
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ── Gender presentation options ──
export const GENDERS = [
  { value: 'feminine', label: 'Feminine', emoji: '🌸' },
  { value: 'masculine', label: 'Masculine', emoji: '🔥' },
  { value: 'androgynous', label: 'Androgynous', emoji: '🌙' },
  { value: 'neutral', label: 'Surprise me', emoji: '✦' },
] as const;

// ── Energy / age-vibe options ──
export const ENERGIES = [
  { value: 'youthful', label: 'Youthful', emoji: '⚡', desc: 'Curious, vibrant, modern' },
  { value: 'prime', label: 'Prime', emoji: '💎', desc: 'Confident, grounded, capable' },
  { value: 'mature', label: 'Mature', emoji: '🌿', desc: 'Calm, sophisticated, wise' },
  { value: 'ageless', label: 'Ageless', emoji: '∞', desc: 'Timeless, ethereal, beyond' },
] as const;

// ── Mapping utilities ──
export const GENDER_MAP: Record<string, string> = {
  feminine: 'female', masculine: 'male', androgynous: 'nonbinary', neutral: 'nonbinary',
};

export const ENERGY_AGE_MAP: Record<string, string> = {
  youthful: 'early 20s', prime: 'early 30s', mature: '40s', ageless: 'ageless',
};

export const GENDER_LABEL_MAP: Record<string, string> = {
  feminine: 'feminine', masculine: 'masculine', androgynous: 'androgynous', neutral: '',
};

export const ENERGY_LABEL_MAP: Record<string, string> = {
  youthful: 'with youthful energy',
  prime: 'with prime energy',
  mature: 'with mature energy',
  ageless: 'with an ageless, timeless quality',
};

/** Reverse map: from DB gender to energy selector value */
export function genderToPresentation(dbGender?: string | null): string | undefined {
  if (!dbGender) return undefined;
  const map: Record<string, string> = { female: 'feminine', male: 'masculine', nonbinary: 'androgynous' };
  return map[dbGender];
}

/** Reverse map: from DB age to energy selector value */
export function ageToEnergy(dbAge?: string | null): string | undefined {
  if (!dbAge) return undefined;
  const lower = dbAge.toLowerCase();
  if (lower.includes('20') || lower === 'youthful') return 'youthful';
  if (lower.includes('30') || lower === 'prime') return 'prime';
  if (lower.includes('40') || lower.includes('50') || lower === 'mature') return 'mature';
  if (lower === 'ageless' || lower === 'timeless') return 'ageless';
  return undefined;
}

interface EnergyGenderSelectorProps {
  gender: string | undefined;
  energy: string | undefined;
  onGenderChange: (value: string) => void;
  onEnergyChange: (value: string) => void;
  /** Compact layout for inline use (e.g., inside a drawer) */
  compact?: boolean;
  /** Custom header text */
  headerText?: string;
  /** Custom subheader text */
  subheaderText?: string;
}

export default function EnergyGenderSelector({
  gender, energy, onGenderChange, onEnergyChange,
  compact = false, headerText, subheaderText,
}: EnergyGenderSelectorProps) {
  return (
    <div className={cn('flex flex-col gap-4', compact ? 'gap-3' : 'gap-5')}>
      {(headerText || subheaderText) && (
        <div className="text-center space-y-1">
          {headerText && (
            <p className={cn(
              'font-serif text-foreground/90 tracking-wide',
              compact ? 'text-sm' : 'text-lg'
            )} style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {headerText}
            </p>
          )}
          {subheaderText && (
            <p className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.25em]">
              {subheaderText}
            </p>
          )}
        </div>
      )}

      {/* Gender presentation */}
      <div className="w-full">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40 text-center mb-3">Presentation</p>
        <div className="grid grid-cols-4 gap-2">
          {GENDERS.map((g) => (
            <motion.button
              key={g.value}
              whileTap={{ scale: 0.93 }}
              onClick={() => onGenderChange(g.value)}
              className={cn(
                'flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl transition-all',
                gender === g.value
                  ? 'border border-primary/40 bg-primary/[0.06]'
                  : 'border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              )}
            >
              <span className="text-base">{g.emoji}</span>
              <p className="text-[10px] font-medium text-foreground/75">{g.label}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Energy / age vibe */}
      <div className="w-full">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40 text-center mb-3">Energy</p>
        <div className={cn('w-full grid gap-3', compact ? 'grid-cols-4' : 'grid-cols-2')}>
          {ENERGIES.map((e) => (
            <motion.button
              key={e.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => onEnergyChange(e.value)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl transition-all',
                compact ? 'px-2 py-3' : 'px-3 py-4',
                energy === e.value
                  ? 'border border-primary/40 bg-primary/[0.06]'
                  : 'border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              )}
            >
              <span className={compact ? 'text-base' : 'text-lg'}>{e.emoji}</span>
              <p className={cn('font-medium text-foreground/80', compact ? 'text-[9px]' : 'text-[11px]')}>{e.label}</p>
              {!compact && <p className="text-[9px] text-muted-foreground/50">{e.desc}</p>}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
