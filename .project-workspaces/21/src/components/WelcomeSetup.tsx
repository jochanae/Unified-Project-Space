import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { calculateAge, isUnder13 } from '@/lib/ageUtils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1900;

function CompaniHeart({ size = 10, style }: { size?: number; style?: React.CSSProperties }) {
  const id = Math.random().toString(36).slice(2);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', ...style }}>
      <defs>
        <linearGradient id={`wsh-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B35" />
          <stop offset="50%" stopColor="#E8547C" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={`url(#wsh-${id})`} />
    </svg>
  );
}

interface WelcomeSetupProps {
  initialName?: string;
  onComplete: (name: string, dob: string, parentEmail?: string) => Promise<void>;
}

export default function WelcomeSetup({ initialName = '', onComplete }: WelcomeSetupProps) {
  const [name, setName] = useState(initialName);
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [error, setError] = useState('');
  const [yearError, setYearError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleYearChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    setDobYear(digits);
    setError('');
    if (digits.length === 4) {
      const y = parseInt(digits);
      if (y < MIN_YEAR) setYearError(`Year must be ${MIN_YEAR} or later`);
      else if (y > CURRENT_YEAR) setYearError(`Year can't be in the future`);
      else setYearError('');
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
    const date = new Date(y, m - 1, d);
    if (date.getMonth() !== m - 1) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const userAge = (() => {
    const dob = getDobString();
    return dob ? calculateAge(dob) : null;
  })();

  const needsParentalConsent = userAge !== null && userAge < 13;

  const handleSubmit = async () => {
    setError('');

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (dobYear.length === 4 && yearError) {
      setError(yearError);
      return;
    }

    const dob = getDobString();
    if (!dob) {
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
      await onComplete(name.trim(), dob, needsParentalConsent ? parentEmail.trim() : undefined);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const yearHasError = yearError || (error && dobYear.length === 4 && (parseInt(dobYear) < MIN_YEAR || parseInt(dobYear) > CURRENT_YEAR));

  return (
    <div className="min-h-[100svh] w-full flex flex-col items-center justify-center px-6" style={{ background: '#0f1221' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-white font-semibold text-xl tracking-wide">Compani</span>
            <CompaniHeart size={18} />
          </div>
          <h1 className="text-white text-2xl font-semibold">Welcome.</h1>
          <p className="text-white/50 text-sm">
            Just two things before your space is ready.
          </p>
        </div>

        {/* Name field */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Your name</label>
          <input
            type="text"
            placeholder="What should we call you?"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            autoComplete="given-name"
          />
        </div>

        {/* DOB fields */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Date of birth</label>
          <p className="text-xs text-white/30">Used to make sure Compani is the right fit for you.</p>

          <div className="flex gap-2">
            <select
              value={dobMonth}
              onChange={(e) => { setDobMonth(e.target.value); setError(''); }}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            >
              <option value="" className="bg-[#0f1221]">Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)} className="bg-[#0f1221]">{m}</option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              max={31}
              placeholder="Day"
              value={dobDay}
              onChange={(e) => { setDobDay(e.target.value); setError(''); }}
              className="w-16 rounded-xl border border-white/10 bg-white/5 px-2.5 py-3 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />

            <div className="relative w-20">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="Year"
                value={dobYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className={`w-full rounded-xl border px-2.5 py-3 text-sm text-white text-center focus:outline-none focus:ring-2 transition-colors ${
                  yearHasError
                    ? 'border-red-500/50 bg-red-500/10 focus:ring-red-500/20'
                    : 'border-white/10 bg-white/5 focus:ring-amber-500/30'
                }`}
              />
              {yearHasError && (
                <div className="absolute -bottom-4 left-0 right-0 text-[10px] text-red-400 text-center whitespace-nowrap">
                  {yearError}
                </div>
              )}
            </div>
          </div>

          {yearHasError && <div className="h-2" />}

          {/* Parental consent — appears for under-13 */}
          <AnimatePresence>
            {needsParentalConsent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 mt-2">
                  <p className="text-xs text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Users under 13 need a parent or guardian's permission.
                  </p>
                  <Input
                    type="email"
                    placeholder="Parent or guardian's email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className="rounded-xl h-10 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && !yearHasError && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {error}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving || !!yearError}
          className="flex w-full items-center justify-center rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #FF6B35, #E8547C, #8B5CF6)' }}
        >
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            "Let's go →"
          )}
        </button>

        <p className="text-center text-xs text-white/20">
          Always private · Powered by AI
        </p>
      </motion.div>
    </div>
  );
}
