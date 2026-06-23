import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import GoldWaveformButton from '@/components/shared/GoldWaveformButton';
import EnergyGenderSelector, { genderToPresentation, ageToEnergy } from '@/components/shared/EnergyGenderSelector';

const ROLE_OPTIONS = [
  { value: 'friend', label: 'Friend', emoji: '💛', desc: 'Someone to talk to, laugh with, and just be yourself around' },
  { value: 'accountability', label: 'Accountability Partner', emoji: '🎯', desc: 'Keeps you on track and calls you out (with love)' },
  { value: 'mentor', label: 'Mentor / Coach', emoji: '🌱', desc: 'Encourages growth and offers guidance' },
  { value: 'assistant', label: 'Personal Assistant', emoji: '📋', desc: 'Organized, helpful, always on top of things' },
  { value: 'romantic', label: 'Romantic Partner', emoji: '💕', desc: 'A deeper, more intimate connection' },
  { value: 'kids-companion', label: 'Adventure Buddy', emoji: '🚀', desc: 'A fun teammate for creative adventures' },
];

interface RolePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companionName: string;
  companionGender?: string;
  companionAge?: string;
  isMinor?: boolean;
  onSelectRole: (role: string, nameOverride?: string, voiceId?: string, chosenGender?: string, chosenEnergy?: string) => void;
}

export default function RolePickerDialog({ open, onOpenChange, companionName, companionGender, companionAge, isMinor, onSelectRole }: RolePickerDialogProps) {
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>(undefined);
  const [gender, setGender] = useState<string | undefined>(undefined);
  const [energy, setEnergy] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (open) {
      setSelectedVoiceId(undefined);
      // Pre-select based on the companion's existing gender/age
      setGender(genderToPresentation(companionGender));
      setEnergy(ageToEnergy(companionAge));
    }
  }, [open, companionGender, companionAge]);

  const filteredRoles = isMinor
    ? ROLE_OPTIONS.filter(r => !['romantic', 'assistant'].includes(r.value))
    : ROLE_OPTIONS.filter(r => r.value !== 'kids-companion');

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-[#131424]/95 backdrop-blur-2xl border-t border-white/[0.08] rounded-t-[28px] max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-foreground font-light tracking-wide">Connect with {companionName}</DrawerTitle>
            <DrawerDescription className="text-center text-xs text-muted-foreground/60">
              You can always change this later in settings.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-6 overflow-y-auto space-y-4">
            {/* Energy & Gender selector */}
            <EnergyGenderSelector
              gender={gender}
              energy={energy}
              onGenderChange={setGender}
              onEnergyChange={setEnergy}
              compact
            />

            {/* Voice selection — gold waveform */}
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md">
              <GoldWaveformButton
                voiceId={selectedVoiceId}
                companionName={companionName}
                companionGender={companionGender || 'neutral'}
                isMinor={isMinor}
                onVoiceChange={(id) => setSelectedVoiceId(id)}
                compact
              />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40">Optional</span>
            </div>

            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40 text-center">What role should they play?</p>

            <div className="flex flex-col gap-0">
              {filteredRoles.map((role, i) => (
                <button
                  key={role.value}
                  onClick={() => {
                    onSelectRole(role.value, undefined, selectedVoiceId, gender, energy);
                    onOpenChange(false);
                  }}
                  className={`w-full px-4 py-4 text-left transition-all duration-300 hover:bg-[rgba(212,175,55,0.08)] hover:border-l-2 hover:border-l-primary/40 hover:pl-3.5 active:scale-[0.98] ${
                    i < filteredRoles.length - 1 ? 'border-b border-white/[0.04]' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xl">{role.emoji}</span>
                    <div>
                      <span className="text-[15px] font-medium text-foreground">{role.label}</span>
                      <p className="text-[12px] text-white/50 mt-1 font-light leading-relaxed">{role.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

    </>
  );
}

export { ROLE_OPTIONS };
