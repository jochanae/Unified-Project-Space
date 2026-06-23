import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Lock, Unlock, Eye } from 'lucide-react';

interface KidPinGateProps {
  onVerify: (pin: string) => Promise<boolean>;
  isRevealed: boolean;
  onReveal: () => void;
  onHide: () => void;
}

export function KidPinGate({ onVerify, isRevealed, onReveal, onHide }: KidPinGateProps) {
  const [pin, setPin] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async () => {
    if (pin.length !== 4) return;
    setIsVerifying(true);
    setError('');
    
    const valid = await onVerify(pin);
    if (valid) {
      onReveal();
      setShowInput(false);
      setPin('');
    } else {
      setError('Wrong PIN! Try again 🔑');
      setPin('');
    }
    setIsVerifying(false);
  };

  if (isRevealed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { onHide(); setShowInput(false); }}
        className="rounded-full text-xs gap-1.5"
      >
        <Eye className="h-3.5 w-3.5" />
        Hide Balance
      </Button>
    );
  }

  if (!showInput) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowInput(true)}
        className="rounded-full gap-1.5 border-dashed"
      >
        <Lock className="h-3.5 w-3.5" />
        Show Balance
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 animate-in fade-in">
      <p className="text-sm font-medium">Enter your PIN 🔑</p>
      <InputOTP
        maxLength={4}
        value={pin}
        onChange={v => { setPin(v); setError(''); }}
        onComplete={handleSubmit}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
      {error && <p className="text-xs text-loss">{error}</p>}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => { setShowInput(false); setPin(''); setError(''); }}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={pin.length !== 4 || isVerifying} className="rounded-full">
          <Unlock className="h-3.5 w-3.5 mr-1" />
          {isVerifying ? '...' : 'Unlock'}
        </Button>
      </div>
    </div>
  );
}
