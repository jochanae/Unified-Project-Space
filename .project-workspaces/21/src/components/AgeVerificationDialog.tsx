import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AgeVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AgeVerificationDialog({ open, onOpenChange, onVerified }: AgeVerificationDialogProps) {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [contentAcknowledged, setContentAcknowledged] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setMonth(''); setDay(''); setYear('');
    setConfirmed(false); setContentAcknowledged(false); setError('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  const calculateAge = (): number | null => {
    const m = parseInt(month);
    const d = parseInt(day);
    const y = parseInt(year);
    if (!m || !d || !y || y < 1900 || y > new Date().getFullYear()) return null;

    const dob = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const handleVerify = () => {
    setError('');
    const age = calculateAge();

    if (age === null) {
      setError('Please enter a valid date of birth.');
      return;
    }
    if (age < 18) {
      setError('You must be 18 or older to subscribe to Premium.');
      return;
    }
    if (!confirmed || !contentAcknowledged) {
      setError('Please confirm both checkboxes to continue.');
      return;
    }

    onVerified();
    handleOpenChange(false);
  };

  const isFormValid = month && day && year && confirmed && contentAcknowledged;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Age Verification
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Premium includes unrestricted conversations. We need to verify you're 18 or older before continuing.
        </p>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Date of Birth
          </Label>
          <div className="flex gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-16 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              placeholder="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-20 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3 pt-1">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="age-confirm"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="age-confirm" className="text-xs text-foreground leading-relaxed cursor-pointer">
              I confirm that I am <strong>18 years of age or older</strong> and meet the minimum age requirement for this service.
            </Label>
          </div>

          <div className="flex items-start gap-2.5">
            <Checkbox
              id="content-ack"
              checked={contentAcknowledged}
              onCheckedChange={(v) => setContentAcknowledged(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="content-ack" className="text-xs text-foreground leading-relaxed cursor-pointer">
              I understand that Premium includes <strong>unrestricted AI conversations</strong> that may include mature content. I accept Compani's{' '}
              <a href="/terms" target="_blank" className="text-primary underline">Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</a>.
            </Label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </motion.div>
        )}

        <Button
          onClick={handleVerify}
          disabled={!isFormValid}
          className="w-full mt-1"
        >
          Continue to Checkout
        </Button>

        <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
          Your date of birth is used solely for age verification and is not stored or shared.
        </p>
      </DialogContent>
    </Dialog>
  );
}
