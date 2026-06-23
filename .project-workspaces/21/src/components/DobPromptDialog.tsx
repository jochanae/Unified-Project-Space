import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { calculateAge } from '@/lib/ageUtils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1900;

interface DobPromptDialogProps {
  open: boolean;
  onSubmit: (dob: string, parentEmail?: string) => Promise<void>;
}

export default function DobPromptDialog({ open, onSubmit }: DobPromptDialogProps) {
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [error, setError] = useState('');
  const [yearError, setYearError] = useState('');
  const [saving, setSaving] = useState(false);

  // Validate year inline as user types
  const handleYearChange = (val: string) => {
    // Only allow digits
    const digits = val.replace(/\D/g, '').slice(0, 4);
    setDobYear(digits);
    setError('');

    if (digits.length === 4) {
      const y = parseInt(digits);
      if (y < MIN_YEAR) {
        setYearError(`Year must be ${MIN_YEAR} or later`);
      } else if (y > CURRENT_YEAR) {
        setYearError(`Year can't be in the future`);
      } else {
        setYearError('');
      }
    } else {
      setYearError('');
    }
  };

  const getDobString = (): string | null => {
    const m = parseInt(dobMonth);
    const d = parseInt(dobDay);
    const y = parseInt(dobYear);
    if (!m || !d || !y) return null;
    if (dobYear.length !== 4) return null;
    if (y < MIN_YEAR || y > CURRENT_YEAR) return null;
    if (d < 1 || d > 31) return null;
    // Basic month/day sanity
    const date = new Date(y, m - 1, d);
    if (date.getMonth() !== m - 1) return null; // catches Feb 30 etc.
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const userAge = (() => {
    const dob = getDobString();
    return dob ? calculateAge(dob) : null;
  })();

  const needsParentalConsent = userAge !== null && userAge < 13;

  const handleSubmit = async () => {
    setError('');

    // Explicit year check with clear message
    if (dobYear.length === 4 && yearError) {
      setError(yearError);
      return;
    }

    const dob = getDobString();
    if (!dob) {
      // Give specific feedback about what's missing
      if (!dobMonth) { setError('Please select a month.'); return; }
      if (!dobDay || parseInt(dobDay) < 1 || parseInt(dobDay) > 31) { setError('Please enter a valid day.'); return; }
      if (dobYear.length !== 4) { setError('Please enter a 4-digit year.'); return; }
      setError('Please enter a valid date of birth.');
      return;
    }

    if (userAge !== null && userAge > 130) {
      setError('Please check your year — that date seems too far back.');
      setDobYear('');
      return;
    }

    if (needsParentalConsent && !parentEmail.trim()) {
      setError('A parent or guardian email is required for users under 13.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(dob, needsParentalConsent ? parentEmail.trim() : undefined);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const yearHasError = yearError || (error && dobYear.length === 4 && (parseInt(dobYear) < MIN_YEAR || parseInt(dobYear) > CURRENT_YEAR));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
      >
        <div className="text-center space-y-1">
          <h2 className="font-display text-lg font-bold text-foreground">When's your birthday? 🎂</h2>
          <p className="text-sm text-muted-foreground">
            This helps us keep your experience age-appropriate.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Date of birth</span>
          </div>

          <div className="flex gap-2">
            <select
              value={dobMonth}
              onChange={(e) => { setDobMonth(e.target.value); setError(''); }}
              className="flex-1 rounded-xl border border-border bg-background px-2.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              max={31}
              placeholder="Day"
              value={dobDay}
              onChange={(e) => { setDobDay(e.target.value); setError(''); }}
              className="w-16 rounded-xl border border-border bg-background px-2.5 py-2.5 text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
            />

            {/* Year — digits only, inline error state */}
            <div className="relative w-20">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="Year"
                value={dobYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className={`w-full rounded-xl border px-2.5 py-2.5 text-sm text-foreground text-center focus:outline-none focus:ring-2 transition-colors ${
                  yearHasError
                    ? 'border-destructive bg-destructive/5 focus:ring-destructive/20'
                    : 'border-border bg-background focus:ring-primary/20'
                }`}
              />
              {yearHasError && (
                <div className="absolute -bottom-4 left-0 right-0 text-[10px] text-destructive text-center whitespace-nowrap">
                  {yearError}
                </div>
              )}
            </div>
          </div>

          {/* Extra spacing when year error tooltip is showing */}
          {yearHasError && <div className="h-2" />}

          <AnimatePresence>
            {needsParentalConsent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                  <p className="text-xs text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Users under 13 need a parent or guardian's permission.
                  </p>
                  <Input
                    type="email"
                    placeholder="Parent or guardian's email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && !yearHasError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || !!yearError}
          className="flex w-full items-center justify-center rounded-xl gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground glow-soft transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
        >
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            'Continue'
          )}
        </button>
      </motion.div>
    </div>
  );
}
