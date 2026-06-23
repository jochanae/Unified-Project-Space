import { useMemo } from 'react'
import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Rule {
  label: string
  test: (pw: string) => boolean
}

const RULES: Rule[] = [
  { label: '6+ characters', test: (pw) => pw.length >= 6 },
  { label: 'One number', test: (pw) => /\d/.test(pw) },
  { label: 'One letter', test: (pw) => /[a-zA-Z]/.test(pw) },
]

interface PasswordStrengthMeterProps {
  password: string
}

/**
 * Live inline password validation — appears as the user types.
 * Cinematic gold-glow strength bar + per-rule checklist.
 * Pure visual; no submission blocking (Supabase enforces 6+ server-side).
 */
export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const passed = useMemo(() => RULES.map((r) => r.test(password)), [password])
  const score = passed.filter(Boolean).length
  const pct = Math.round((score / RULES.length) * 100)

  const tierLabel =
    score === 0 ? 'Weak' : score === 1 ? 'Weak' : score === 2 ? 'Fair' : 'Strong'

  return (
    <div className="mt-2 space-y-1.5">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              score < 2
                ? 'bg-destructive/70'
                : score < 3
                  ? 'bg-primary/50'
                  : 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className={cn(
            'text-[10px] uppercase tracking-[0.18em] font-mono w-12 text-right',
            score < 2
              ? 'text-destructive/80'
              : score < 3
                ? 'text-primary/70'
                : 'text-primary',
          )}
        >
          {tierLabel}
        </span>
      </div>

      {/* Rule checklist — compact inline row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {RULES.map((rule, i) => (
          <span
            key={rule.label}
            className={cn(
              'flex items-center gap-1 text-[10px] transition-colors',
              passed[i] ? 'text-primary' : 'text-muted-foreground/50',
            )}
          >
            {passed[i] ? (
              <Check className="h-2.5 w-2.5" />
            ) : (
              <Circle className="h-2.5 w-2.5" />
            )}
            {rule.label}
          </span>
        ))}
      </div>
    </div>
  )
}
