import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AVATAR_PRESETS, CARD_DESIGNS } from '@/hooks/useKidProfile';
import { ArrowRight, ArrowLeft, Sparkles, Check } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface KidOnboardingWizardProps {
  onComplete: (data: {
    display_name: string;
    avatar_preset: string;
    card_design: string;
    pin: string;
  }) => void;
  isSubmitting?: boolean;
}

type Step = 'name' | 'avatar' | 'card' | 'pin';

export function KidOnboardingWizard({ onComplete, isSubmitting }: KidOnboardingWizardProps) {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('astronaut');
  const [cardDesign, setCardDesign] = useState('galaxy');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  const steps: Step[] = ['name', 'avatar', 'card', 'pin'];
  const currentIndex = steps.indexOf(step);

  const canProceed = () => {
    switch (step) {
      case 'name': return name.trim().length >= 2;
      case 'avatar': return true;
      case 'card': return true;
      case 'pin': return pin.length === 4 && confirmPin.length === 4;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step === 'pin') {
      if (pin !== confirmPin) {
        setPinError("PINs don't match! Try again 🔑");
        setConfirmPin('');
        return;
      }
      onComplete({ display_name: name.trim(), avatar_preset: avatar, card_design: cardDesign, pin });
      return;
    }
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) setStep(steps[nextIndex]);
  };

  const handleBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) setStep(steps[prevIndex]);
  };

  const selectedCard = CARD_DESIGNS.find(c => c.id === cardDesign)!;
  const selectedAvatar = AVATAR_PRESETS.find(a => a.id === avatar)!;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {steps.map((s, i) => (
          <div
            key={s}
            className={cn(
              'h-2 w-12 rounded-full transition-all',
              i <= currentIndex ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Step: Name */}
      {step === 'name' && (
        <div className="text-center space-y-6 w-full max-w-md animate-in fade-in">
          <div className="text-6xl">👋</div>
          <h2 className="text-3xl font-bold">What's your name?</h2>
          <p className="text-muted-foreground">This is what we'll call you in Youth Mode!</p>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter your name..."
            className="text-center text-xl h-14 rounded-xl"
            maxLength={20}
            autoFocus
          />
        </div>
      )}

      {/* Step: Avatar */}
      {step === 'avatar' && (
        <div className="text-center space-y-6 w-full max-w-lg animate-in fade-in">
          <h2 className="text-3xl font-bold">Choose your avatar!</h2>
          <p className="text-muted-foreground">Pick a character that represents you</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {AVATAR_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => setAvatar(preset.id)}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all hover:scale-105',
                  avatar === preset.id
                    ? 'border-primary bg-primary/10 scale-105 shadow-lg'
                    : 'border-transparent bg-muted/50 hover:bg-muted'
                )}
              >
                <span className="text-3xl">{preset.emoji}</span>
                <span className="text-xs font-medium truncate w-full">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Card Design */}
      {step === 'card' && (
        <div className="text-center space-y-6 w-full max-w-2xl animate-in fade-in">
          <h2 className="text-3xl font-bold">Pick your card!</h2>
          <p className="text-muted-foreground">This is your personal money card</p>

          {/* Preview */}
          <div className={cn(
            'mx-auto w-72 h-44 rounded-2xl p-5 flex flex-col justify-between text-white shadow-2xl bg-gradient-to-br transition-all',
            selectedCard.gradient
          )}>
            <div className="flex justify-between items-start">
              <span className="text-2xl">{selectedAvatar.emoji}</span>
              <span className="text-lg font-bold tracking-wider">IntoIQ</span>
            </div>
            <div>
              <p className="text-xs opacity-80 uppercase tracking-wider">Explorer Card</p>
              <p className="text-xl font-bold">{name || 'Your Name'}</p>
              <p className="text-sm opacity-70">{selectedCard.pattern}</p>
            </div>
          </div>

          {/* Card options */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CARD_DESIGNS.map(card => (
              <button
                key={card.id}
                onClick={() => setCardDesign(card.id)}
                className={cn(
                  'relative p-3 rounded-xl border-2 transition-all hover:scale-105 overflow-hidden',
                  cardDesign === card.id
                    ? 'border-primary shadow-lg scale-105'
                    : 'border-transparent hover:border-muted-foreground/20'
                )}
              >
                <div className={cn('h-16 rounded-lg bg-gradient-to-br mb-2', card.gradient)} />
                <p className="text-xs font-medium">{card.label}</p>
                <p className="text-xs">{card.pattern}</p>
                {cardDesign === card.id && (
                  <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: PIN */}
      {step === 'pin' && (
        <div className="text-center space-y-6 w-full max-w-md animate-in fade-in">
          <div className="text-6xl">🔒</div>
          <h2 className="text-3xl font-bold">Set your secret PIN!</h2>
          <p className="text-muted-foreground">Use this PIN to see your balance. Don't forget it!</p>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Enter 4-digit PIN</p>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={pin} onChange={v => { setPin(v); setPinError(''); }}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            {pin.length === 4 && (
              <div className="animate-in fade-in">
                <p className="text-sm font-medium mb-2">Confirm your PIN</p>
                <div className="flex justify-center">
                  <InputOTP maxLength={4} value={confirmPin} onChange={v => { setConfirmPin(v); setPinError(''); }}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            )}

            {pinError && (
              <p className="text-sm text-loss font-medium">{pinError}</p>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {currentIndex > 0 && (
          <Button variant="outline" onClick={handleBack} className="rounded-full px-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <Button
          onClick={handleNext}
          disabled={!canProceed() || isSubmitting}
          className="rounded-full px-8 bg-gradient-to-r from-primary to-gain"
        >
          {step === 'pin' ? (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Creating...' : "Let's Go!"}
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
