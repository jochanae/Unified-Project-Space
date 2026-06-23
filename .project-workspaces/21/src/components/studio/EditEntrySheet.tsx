/**
 * EditEntrySheet — "Command Center" bottom sheet for companion refinement.
 * Acts as a teleport trigger with 3 glass tiles: Visuals, Vibe, Identity.
 * Also keeps quick actions (Restyle, New Look, Upload) at the top.
 */

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paintbrush, Wand2, ChevronRight, Eye, Heart, Sparkles,
  ArrowRight, Camera, Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Connection } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

const OUTFIT_SUGGESTIONS = [
  { label: '👔 Formal', value: 'wearing a formal suit with tie' },
  { label: '👕 Casual', value: 'wearing casual streetwear, relaxed fit' },
  { label: '🏖️ Summer', value: 'wearing summer clothes, light and breezy' },
  { label: '🧥 Cozy', value: 'wearing a cozy sweater and warm layers' },
  { label: '🎭 Fancy', value: 'wearing elegant evening attire, dressed up' },
  { label: '🏋️ Athletic', value: 'wearing athletic sportswear' },
];

const STYLE_OPTIONS = [
  { label: '📸 Photorealistic', value: 'photorealistic' },
  { label: '🎨 Painterly', value: 'painterly' },
  { label: '🖼️ Illustrated', value: 'illustrated' },
  { label: '🌑 Moody Portrait', value: 'moody portrait' },
  { label: '💻 Digital Art', value: 'digital art' },
  { label: '✨ Anime', value: 'anime' },
  { label: '💥 Comic', value: 'comic' },
  { label: '🎲 3D Render', value: '3d render' },
  { label: '💧 Watercolor', value: 'watercolor' },
  { label: '🌐 Cyberpunk', value: 'cyberpunk' },
  { label: '🌀 Abstract', value: 'abstract' },
  { label: '🌌 Cosmic / Energy', value: 'cosmic / energy' },
];

/* ── Teleport tiles ── */
const TELEPORT_TILES = [
  {
    step: 0,
    icon: Eye,
    label: 'Visuals',
    sub: 'Style, wardrobe, appearance',
    gradient: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(180,140,255,0.08))',
  },
  {
    step: 1,
    icon: Sparkles,
    label: 'Vibe',
    sub: 'Energy, personality, tone',
    gradient: 'linear-gradient(135deg, rgba(100,200,255,0.1), rgba(140,80,220,0.1))',
  },
  {
    step: 2,
    icon: Heart,
    label: 'Identity',
    sub: 'Name, role, backstory',
    gradient: 'linear-gradient(135deg, rgba(255,100,100,0.08), rgba(255,180,60,0.1))',
  },
];

export interface EditEntrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companion: Connection;
  isMinor: boolean;
  currentRole: string;
  currentPersonalityVibes: string[];
  currentMood: string;
  onRestyle: (userInput: string) => void;
  onNewLook: (userInput: string, newStyle?: string) => void;
  onRoleChange: (role: string) => void;
  onNameSave: (name: string) => void;
  onPersonalitySave: (vibes: string[]) => void;
  onMoodSave: (mood: string) => void;
  onOpenFullStudio: () => void;
  onUpdateBackstory?: (text: string) => void;
  onUploadPhoto?: () => void;
  onUpdateAppearance?: (desc: string) => void;
  onTeleportToStep?: (step: number) => void;
}

type QuickAction = null | 'restyle' | 'newlook';

export default function EditEntrySheet({
  open,
  onOpenChange,
  companion,
  isMinor,
  currentRole,
  currentPersonalityVibes,
  currentMood,
  onRestyle,
  onNewLook,
  onRoleChange,
  onNameSave,
  onPersonalitySave,
  onMoodSave,
  onOpenFullStudio,
  onUpdateBackstory,
  onUploadPhoto,
  onUpdateAppearance,
  onTeleportToStep,
}: EditEntrySheetProps) {
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [customInput, setCustomInput] = useState('');
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuickAction(null);
      setCustomInput('');
      setSelectedOutfit(null);
      setSelectedStyle(null);
    }
  }, [open]);

  const handleRestyle = () => {
    const input = customInput.trim() || selectedOutfit || '';
    onRestyle(input);
    onOpenChange(false);
    setQuickAction(null);
    setCustomInput('');
    setSelectedOutfit(null);
  };
  const handleNewLook = () => {
    const input = customInput.trim() || '';
    onNewLook(input, selectedStyle || undefined);
    onOpenChange(false);
    setQuickAction(null);
    setCustomInput('');
    setSelectedStyle(null);
  };

  const handleTeleport = (step: number) => {
    onOpenChange(false);
    onOpenFullStudio();
    setTimeout(() => onTeleportToStep?.(step), 150);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto px-0 pb-8 !bg-transparent border-0"
        style={{
          background: 'rgba(10, 10, 20, 0.92)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* ═══ Header ═══ */}
        <SheetHeader className="text-left mb-5 px-5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/10">
              {companion.avatarUrl ? (
                <img src={companion.avatarUrl} alt={companion.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-white">
                  {companion.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="font-display text-lg font-bold text-white">
                Refining {companion.name}
              </SheetTitle>
              <SheetDescription className="text-sm text-white/50">
                Your companion's command center
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* ── Quick Actions Row ── */}
        <div className="grid grid-cols-3 gap-2 mb-5 px-5">
          {[
            { key: 'restyle' as QuickAction, icon: Paintbrush, label: 'Restyle', sub: 'Change outfit' },
            { key: 'newlook' as QuickAction, icon: Wand2, label: 'New Look', sub: 'New art style' },
            { key: null, icon: Camera, label: 'Upload', sub: 'Use your photo' },
          ].map(({ key, icon: Icon, label, sub }) => (
            <button
              key={label}
              onClick={() => {
                if (key === null) { onUploadPhoto?.(); onOpenChange(false); return; }
                setQuickAction(quickAction === key ? null : key);
              }}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all active:scale-[0.97]',
                quickAction === key ? 'ring-2 ring-primary' : '',
              )}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-white font-semibold text-xs">{label}</span>
              <span className="text-white/50 text-[9px] text-center leading-tight">{sub}</span>
            </button>
          ))}
        </div>

        {/* ── Quick action panels ── */}
        <AnimatePresence>
          {quickAction === 'restyle' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden px-5"
            >
              <div className="mb-5 rounded-xl p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs text-white/60 font-medium">What should {companion.name} wear?</p>
                <div className="flex flex-wrap gap-1.5">
                  {OUTFIT_SUGGESTIONS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => { setSelectedOutfit(selectedOutfit === s.value ? null : s.value); setCustomInput(''); }}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border',
                        selectedOutfit === s.value
                          ? 'bg-primary/20 border-primary text-white'
                          : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70',
                      )}
                    >{s.label}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customInput}
                    onChange={e => { setCustomInput(e.target.value); if (e.target.value) setSelectedOutfit(null); }}
                    placeholder="Or describe a look..."
                    className="flex-1 h-9 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                  <Button size="sm" onClick={handleRestyle} disabled={!customInput.trim() && !selectedOutfit} className="h-9 px-3 gap-1">
                    <ArrowRight className="h-3.5 w-3.5" /> Go
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {quickAction === 'newlook' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden px-5"
            >
              <div className="mb-5 rounded-xl p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs text-white/60 font-medium">Pick a new art style for {companion.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_OPTIONS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setSelectedStyle(selectedStyle === s.value ? null : s.value)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border',
                        selectedStyle === s.value
                          ? 'bg-primary/20 border-primary text-white'
                          : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70',
                      )}
                    >{s.label}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    placeholder="Additional details (optional)..."
                    className="flex-1 h-9 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                  <Button size="sm" onClick={handleNewLook} disabled={!selectedStyle && !customInput.trim()} className="h-9 px-3 gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Go
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ Teleport Tiles ═══ */}
        <div className="px-5 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-3">Refine</p>
          <div className="grid grid-cols-3 gap-2.5">
            {TELEPORT_TILES.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.step}
                  onClick={() => handleTeleport(tile.step)}
                  className="group relative flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-all active:scale-[0.96]"
                  style={{
                    background: tile.gradient,
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 group-hover:bg-white/15 transition-colors">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/90">{tile.label}</p>
                    <p className="text-[9px] text-white/40 mt-0.5 leading-snug">{tile.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Current state preview snippets ── */}
        <div className="px-5 space-y-2 mb-4">
          {[
            { label: 'Role', value: currentRole || '—', step: 2 },
            { label: 'Mood', value: currentMood || 'Not set', step: 1 },
            { label: 'Personality', value: currentPersonalityVibes.length > 0 ? currentPersonalityVibes.join(', ') : 'Not set', step: 1 },
          ].map(({ label, value, step }) => (
            <button
              key={label}
              onClick={() => handleTeleport(step)}
              className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 transition-all active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-[11px] font-semibold text-white/50">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/70 truncate max-w-[180px]">{value}</span>
                <ChevronRight className="h-3 w-3 text-white/20" />
              </div>
            </button>
          ))}
        </div>

        {/* ── Open Full Studio ── */}
        <div className="px-5">
          <button
            onClick={() => { onOpenFullStudio(); onOpenChange(false); }}
            className="w-full rounded-2xl h-11 text-sm font-semibold text-white/60 transition-colors active:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}
          >
            Open Full Studio →
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
