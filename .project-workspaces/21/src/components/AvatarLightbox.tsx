import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Sparkles, Heart, ChevronDown, ChevronRight, User, MessageCircle, Users, Shield, BookOpen, Pencil, Check, Wand2, Loader2, Info, ArrowRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { COMMUNICATION_STYLES } from '@/lib/communicationStyles';
import OriginStoryPicker from '@/components/OriginStoryPicker';
import BackstoryAssistSheet, { BackstoryQualityWhisper } from '@/components/studio/BackstoryAssistSheet';

interface AvatarLightboxProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  name: string;
  bio?: string;
  vibe?: string;
  personality?: string;
  age?: string;
  gender?: string;
  connectedAt?: string;
  communicationStyle?: string;
  connectionMode?: string;
  circles?: string[];
  backstory?: string;
  originStory?: string;
  onUpdateBackstory?: (text: string) => void;
  onUpdateOriginStory?: (text: string) => void;
  onUpdateField?: (field: string, value: string) => void;
  /** Browse mode: show a connect CTA */
  onConnect?: () => void;
  connectLabel?: string;
  isConnecting?: boolean;
}

/* ── Ghost-glow trait pill ─────────────────────────────────── */
function TraitPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-primary/40 bg-transparent px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors"
      style={{
        color: 'hsl(var(--primary))',
        textShadow: '0 0 8px hsl(var(--primary) / 0.5)',
        boxShadow: '0 0 6px hsl(var(--primary) / 0.15), inset 0 0 6px hsl(var(--primary) / 0.05)',
      }}
    >
      {children}
    </span>
  );
}

/* ── Style multi-select (separate component to avoid hooks-in-conditionals) ── */
function StyleMultiSelect({ icon: Icon, value, name, onSave }: {
  icon: React.ElementType; value: string; name: string; onSave?: (v: string) => void;
}) {
  const selectedIds = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
  const customEntries = selectedIds.filter(s => s.startsWith('custom:'));
  const standardIds = selectedIds.filter(s => !s.startsWith('custom:'));
  const [showOtherInput, setShowOtherInput] = useState(customEntries.length > 0);
  const [customText, setCustomText] = useState(customEntries.map(c => c.replace('custom:', '')).join(', '));

  const updateValue = (ids: string[]) => {
    const newVal = ids.join(',');
    onSave?.(newVal);
  };

  const toggleStyle = (id: string) => {
    const updated = standardIds.includes(id)
      ? selectedIds.filter(s => s !== id)
      : [...selectedIds, id];
    updateValue(updated);
  };

  const saveCustom = () => {
    const trimmed = customText.trim();
    const withoutCustom = selectedIds.filter(s => !s.startsWith('custom:'));
    const updated = trimmed ? [...withoutCustom, `custom:${trimmed}`] : withoutCustom;
    updateValue(updated);
  };

  if (!onSave) {
    const labels = standardIds.map(id => COMMUNICATION_STYLES.find(s => s.id === id)?.label || id);
    if (customEntries.length) labels.push(customEntries.map(c => c.replace('custom:', '')).join(', '));
    const displayText = labels.join(', ');
    // Hide entirely when empty (pre-connection)
    if (!displayText) return null;
    return (
      <div className="flex items-start gap-2.5 py-1.5">
        <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/60" />
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-white/50 block">Communication Style</span>
          <span className="text-xs text-white/80">{displayText}</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-start gap-2.5 py-1.5">
        <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/60" />
        <div className="min-w-0 flex-1">
          <span className="text-[10px] uppercase tracking-wider text-white/50 block mb-1.5">Communication Style</span>
          <div className="flex flex-wrap gap-1.5">
            {COMMUNICATION_STYLES.map(style => {
              const isActive = standardIds.includes(style.id);
              return (
                <Tooltip key={style.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleStyle(style.id); }}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] transition-all border ${
                        isActive
                          ? 'bg-primary/20 border-primary/40 text-white'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'
                      }`}
                    >
                      <span>{style.emoji}</span>
                      <span>{style.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    <p className="font-medium mb-0.5">{style.emoji} {style.label}</p>
                    <p className="text-muted-foreground">{style.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowOtherInput(!showOtherInput); }}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] transition-all border ${
                showOtherInput && customText.trim()
                  ? 'bg-primary/20 border-primary/40 text-white'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              <span>✏️</span>
              <span>Other</span>
            </button>
          </div>
          {showOtherInput && (
            <div className="mt-2">
              <Input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onBlur={saveCustom}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveCustom(); }}}
                placeholder="Describe your own style..."
                className="h-7 bg-white/5 border-white/10 text-xs text-white/80"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ── Inline-editable About row (always editable, saves on change) ── */
function InlineField({ icon: Icon, label, value, onSave, fieldType, name }: {
  icon: React.ElementType; label: string; value: string;
  onSave?: (v: string) => void; fieldType?: 'gender' | 'role' | 'text'; name: string;
}) {
  const [localVal, setLocalVal] = useState(value);

  const handleChange = (v: string) => {
    setLocalVal(v);
    if (onSave && v !== value) {
      onSave(v);
      toast.success(`${name}'s ${label.toLowerCase()} updated`);
    }
  };

  if (!onSave) {
    // Read-only display — hide entirely when empty (pre-connection)
    if (!value) return null;
    return (
      <div className="flex items-start gap-2.5 py-1.5">
        <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/60" />
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-white/50 block">{label}</span>
          <span className="text-xs text-white/80 capitalize">{value}</span>
        </div>
      </div>
    );
  }

  if (fieldType === 'gender') {
    return (
      <div className="flex items-start gap-2.5 py-1.5">
        <Icon className="h-3.5 w-3.5 mt-2 shrink-0 text-primary/60" />
        <div className="min-w-0 flex-1">
          <span className="text-[10px] uppercase tracking-wider text-white/50 block mb-1">{label}</span>
          <Select value={localVal} onValueChange={handleChange}>
            <SelectTrigger className="h-7 bg-white/5 border-white/10 text-xs text-white/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="nonbinary">Non-binary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (fieldType === 'role') {
    return (
      <div className="flex items-start gap-2.5 py-1.5">
        <Icon className="h-3.5 w-3.5 mt-2 shrink-0 text-primary/60" />
        <div className="min-w-0 flex-1">
          <span className="text-[10px] uppercase tracking-wider text-white/50 block mb-1">{label}</span>
          <Select value={localVal} onValueChange={handleChange}>
            <SelectTrigger className="h-7 bg-white/5 border-white/10 text-xs text-white/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friend">Friend</SelectItem>
              <SelectItem value="accountability">Accountability Partner</SelectItem>
              <SelectItem value="mentor">Mentor / Coach</SelectItem>
              <SelectItem value="assistant">Personal Assistant</SelectItem>
              <SelectItem value="romantic">Romantic Partner</SelectItem>
              <SelectItem value="kids-companion">Kids Companion</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }


  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 mt-2 shrink-0 text-primary/60" />
      <div className="min-w-0 flex-1">
        <span className="text-[10px] uppercase tracking-wider text-white/50 block mb-1">{label}</span>
        <Input
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={() => { if (localVal !== value) handleChange(localVal); }}
          className="h-7 bg-white/5 border-white/10 text-xs text-white/80"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

/* ── Shared biography card content ─────────────────────────── */
function BiographyContent({
  imageUrl, name, bio, vibe, personality, age, gender, connectedAt,
  communicationStyle, connectionMode, circles, isMobile, backstory, originStory, onUpdateBackstory, onUpdateOriginStory, onUpdateField,
  onConnect, connectLabel, isConnecting,
}: Omit<AvatarLightboxProps, 'open' | 'onClose'> & { isMobile: boolean }) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [storyEditing, setStoryEditing] = useState(false);
  const [storyDraft, setStoryDraft] = useState(backstory || '');
  const [generating, setGenerating] = useState(false);
  const [originEditing, setOriginEditing] = useState(false);
  const [originDraft, setOriginDraft] = useState(originStory || '');
  const [generatingOrigin, setGeneratingOrigin] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);

  const hasAboutData = personality || communicationStyle || connectionMode || (circles && circles.length > 0) || backstory || originStory || onUpdateBackstory || onUpdateOriginStory || onUpdateField;

  const handleGenerateBackstory = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-backstory', {
        body: { companionName: name, personality, age, gender, connectionMode, bio },
      });
      if (error) throw error;
      const generated = data?.backstory || '';
      if (generated) {
        setStoryDraft(generated);
        setStoryEditing(true);
        toast.success('Backstory generated! Review and save it.');
      }
    } catch (e) {
      console.error('Generate backstory error:', e);
      toast.error('Failed to generate backstory');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateOriginStory = async () => {
    setGeneratingOrigin(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-backstory', {
        body: { companionName: name, personality, age, gender, connectionMode, bio, backstory, type: 'origin' },
      });
      if (error) throw error;
      const generated = data?.backstory || '';
      if (generated) {
        setOriginDraft(generated);
        setOriginEditing(true);
        toast.success('Origin story generated! Review and save it.');
      }
    } catch (e) {
      console.error('Generate origin story error:', e);
      toast.error('Failed to generate origin story');
    } finally {
      setGeneratingOrigin(false);
    }
  };

  return (
    <>
      {/* ── Blurred backdrop ── */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src={imageUrl}
          alt=""
          aria-hidden
          className="h-full w-full object-cover scale-110 blur-[40px] brightness-[0.35] saturate-[1.3]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
      </div>

      {/* ── Cover photo banner ── */}
      <div className={`relative w-full overflow-hidden ${isMobile ? 'h-56' : 'h-44'}`}>
        <motion.img
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          src={imageUrl}
          alt=""
          aria-hidden
          className="h-full w-full object-cover"
          style={{ objectPosition: 'center 15%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
          }}
        />
      </div>

      {/* ── Hero portrait ── */}
      <div className={`relative mx-auto ${isMobile ? '-mt-20 mb-3' : '-mt-16 mb-2'}`}>
        <div
          className="relative mx-auto overflow-hidden rounded-full shadow-2xl ring-4 ring-background/80"
          style={{
            width: isMobile ? 140 : 120,
            height: isMobile ? 140 : 120,
            boxShadow: '0 0 0 3px hsl(var(--primary) / 0.3), 0 0 40px hsl(var(--primary) / 0.15), 0 20px 60px -15px rgba(0,0,0,0.5)',
          }}
        >
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        </div>
        <motion.div
          className="absolute rounded-full border border-primary/20 pointer-events-none"
          style={{
            width: isMobile ? 140 : 120,
            height: isMobile ? 140 : 120,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* ── Name ── */}
      <h2
        className={`text-center font-display font-bold text-white ${isMobile ? 'text-3xl' : 'text-2xl'}`}
        style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
      >
        {name}
      </h2>

      {/* ── Vibe badge ── */}
      {vibe && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-2 flex justify-center"
        >
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm"
            style={{
              color: 'hsl(var(--primary))',
              textShadow: '0 0 10px hsl(var(--primary) / 0.6)',
              boxShadow: '0 0 12px hsl(var(--primary) / 0.1)',
            }}
          >
            <Sparkles className="h-3 w-3" />
            {vibe}
          </span>
        </motion.div>
      )}

      {/* ── Bio quote ── */}
      {bio && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-5 mx-auto max-w-xs px-4"
        >
          <div
            className="rounded-2xl border border-white/10 px-5 py-4 text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <Heart className="h-4 w-4 text-primary/60 mx-auto mb-2" />
            <p className="text-sm leading-relaxed text-white/80 italic">
              "{bio}"
            </p>
          </div>
        </motion.div>
      )}

      {/* ── About [Name] collapsible section ── */}
      {hasAboutData && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-5 mx-auto max-w-xs px-4"
        >
          <Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
            <CollapsibleTrigger className="w-full">
              <div
                className="flex items-center justify-between w-full rounded-xl border border-white/10 px-4 py-3 transition-colors hover:border-primary/30"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
              >
                <div>
                  <span className="text-xs font-semibold text-white/70">About {name}</span>
                  <p className="text-[10px] text-white/35 mt-0.5">Personality, backstory & more</p>
                  {!connectedAt && (
                    <p className="text-[9px] text-white/25 mt-0.5 italic">You can always shape who they are in the Studio</p>
                  )}
                </div>
                {aboutOpen
                  ? <ChevronDown className="h-3.5 w-3.5 text-white/50" />
                  : <ChevronRight className="h-3.5 w-3.5 text-white/50" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div
                className="mt-1 rounded-xl border border-white/10 px-4 py-3 space-y-0.5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
              >
                {/* ── Always-editable inline fields ── */}
                <InlineField icon={Sparkles} label="Personality" value={personality || ''} name={name}
                  onSave={onUpdateField ? (v) => onUpdateField('personality', v) : undefined} />
                <StyleMultiSelect icon={MessageCircle} value={communicationStyle || ''} name={name}
                  onSave={onUpdateField ? (v) => onUpdateField('communicationStyle', v) : undefined} />
                <InlineField icon={Shield} label="Role" value={connectionMode || ''} fieldType="role" name={name}
                  onSave={onUpdateField ? (v) => onUpdateField('connectionMode', v) : undefined} />
                <InlineField icon={User} label="Age" value={age || ''} name={name}
                  onSave={onUpdateField ? (v) => onUpdateField('age', v) : undefined} />
                <InlineField icon={User} label="Gender" value={gender || ''} fieldType="gender" name={name}
                  onSave={onUpdateField ? (v) => onUpdateField('gender', v) : undefined} />
                {circles && circles.length > 0 && (
                  <div className="flex items-start gap-2.5 py-1.5">
                    <Users className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/60" />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-white/50 block">Circles</span>
                      <span className="text-xs text-white/80 capitalize">{circles.join(', ')}</span>
                    </div>
                  </div>
                )}

                {/* ── Editable Story ── */}
                {(onUpdateBackstory || backstory) && (
                <div className="pt-2 border-t border-white/10 mt-2">
                  <div className="flex items-center justify-between mb-1.5">
                     <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/50">
                      <BookOpen className="h-3 w-3" /> Story
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Generate button */}
                      {onUpdateBackstory && !storyEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStoryDraft(backstory || '');
                            setAssistOpen(true);
                          }}
                          className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary"
                        >
                          <Wand2 className="h-3 w-3" />
                          ✨ Help me write
                        </button>
                      )}
                      {onUpdateBackstory && (
                        storyEditing ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateBackstory(storyDraft);
                              setStoryEditing(false);
                              toast.success(`${name}'s story saved`);
                            }}
                            className="flex items-center gap-1 text-[10px] text-primary/80 hover:text-primary"
                          >
                            <Check className="h-3 w-3" /> Save
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStoryDraft(backstory || '');
                              setStoryEditing(true);
                            }}
                            className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white/60"
                          >
                            <Pencil className="h-3 w-3" /> {backstory ? 'Edit' : 'Add'}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  {storyEditing ? (
                    <>
                      <Textarea
                        value={storyDraft}
                        onChange={(e) => setStoryDraft(e.target.value)}
                        placeholder={`Where is ${name} from? What do they do? Family, interests, quirks…`}
                        className="min-h-[80px] bg-white/5 border-white/10 text-xs text-white/80 placeholder:text-white/30 resize-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <BackstoryQualityWhisper text={storyDraft} />
                    </>
                  ) : backstory ? (
                    <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{backstory}</p>
                  ) : (
                    <p className="text-xs text-white/40 italic">Tap edit or ✨ Help me write to add {name}'s story…</p>
                  )}
                </div>
                )}

                {/* ── How We Met (Origin Story) ── */}
                {(onUpdateOriginStory || originStory) && (
                <div className="pt-2 border-t border-white/10 mt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/50">
                      <Heart className="h-3 w-3" /> How We Met
                    </span>
                    <div className="flex items-center gap-2">
                      {onUpdateOriginStory && !originEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateOriginStory();
                          }}
                          disabled={generatingOrigin}
                          className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary disabled:opacity-50"
                        >
                          {generatingOrigin ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                          {generatingOrigin ? 'Generating…' : '✨ Generate'}
                        </button>
                      )}
                      {onUpdateOriginStory && (
                        originEditing ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateOriginStory(originDraft);
                              setOriginEditing(false);
                              toast.success('Origin story saved');
                            }}
                            className="flex items-center gap-1 text-[10px] text-primary/80 hover:text-primary"
                          >
                            <Check className="h-3 w-3" /> Save
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOriginDraft(originStory || '');
                              setOriginEditing(true);
                            }}
                            className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white/60"
                          >
                            <Pencil className="h-3 w-3" /> {originStory ? 'Edit' : 'Add'}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  {originEditing ? (
                    <Textarea
                      value={originDraft}
                      onChange={(e) => setOriginDraft(e.target.value)}
                      placeholder={`How did you and ${name} meet? What were those early days like?`}
                      className="min-h-[80px] bg-white/5 border-white/10 text-xs text-white/80 placeholder:text-white/30 resize-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : originStory ? (
                    <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{originStory}</p>
                  ) : onUpdateOriginStory ? (
                    <OriginStoryPicker
                      companionName={name}
                      personality={personality}
                      age={age}
                      gender={gender}
                      connectionMode={connectionMode}
                      bio={bio}
                      backstory={backstory}
                      compact
                      onSelect={(story) => {
                        onUpdateOriginStory(story);
                        toast.success('Origin story saved ✨');
                      }}
                    />
                  ) : (
                    <p className="text-xs text-white/40 italic">Add your story together — how did you meet?</p>
                  )}
                </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </motion.div>
      )}

      {/* ── Trait pills ── */}
      {(personality || age || gender) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-5 flex flex-wrap justify-center gap-2 px-4"
        >
          {(() => {
            const roleDescriptors: Record<string, string> = {
              friend: 'Warm · Genuine · Present',
              accountability: 'Focused · Motivating · Structured',
              mentor: 'Insightful · Wise · Strategic',
              assistant: 'Efficient · Attentive · Reliable',
              romantic: 'Warm · Playful · Deeply Connected',
              'kids-companion': 'Fun · Encouraging · Safe',
            };
            const descriptor = connectionMode ? roleDescriptors[connectionMode] : null;
            return <TraitPill>{descriptor || personality || 'Friendly'}</TraitPill>;
          })()}
          {age && <TraitPill>Age {age}</TraitPill>}
          {gender && <TraitPill>{gender}</TraitPill>}
        </motion.div>
      )}

      {/* ── Connect CTA (browse mode) ── */}
      {onConnect && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-6 mx-auto w-full max-w-sm px-4"
        >
          <button
            onClick={(e) => { e.stopPropagation(); onConnect(); }}
            disabled={isConnecting}
            className="w-full py-3.5 px-6 rounded-2xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
              boxShadow: '0 0 20px hsl(var(--primary) / 0.3), 0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            {isConnecting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
            ) : (
              <><span className="truncate">{connectLabel || 'Connect'}</span> <ArrowRight className="h-4 w-4 flex-shrink-0" /></>
            )}
          </button>
        </motion.div>
      )}

      {/* ── Connected date ── */}
      {connectedAt && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-5 mb-8 flex items-center justify-center gap-1.5 text-xs text-white/50"
        >
          <Calendar className="h-3 w-3" />
          Connected {new Date(connectedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </motion.p>
      )}

      {/* ── Backstory Assist Sheet ── */}
      {onUpdateBackstory && (
        <BackstoryAssistSheet
          open={assistOpen}
          onOpenChange={setAssistOpen}
          companionName={name}
          gender={gender}
          age={age}
          personality={personality}
          connectionMode={connectionMode}
          bio={bio}
          currentDraft={storyDraft}
          onApply={(text) => {
            setStoryDraft(text);
            setStoryEditing(true);
          }}
        />
      )}
    </>
  );
}

export default function AvatarLightbox({
  open, onClose, imageUrl, name, bio, vibe, personality, age, gender, connectedAt,
  communicationStyle, connectionMode, circles, backstory, originStory, onUpdateBackstory, onUpdateOriginStory, onUpdateField,
  onConnect, connectLabel, isConnecting,
}: AvatarLightboxProps) {
  const isMobile = useIsMobile();

  if (!open) return null;

  const profileProps = { imageUrl, name, bio, vibe, personality, age, gender, connectedAt, communicationStyle, connectionMode, circles, backstory, originStory, onUpdateBackstory, onUpdateOriginStory, onUpdateField, onConnect, connectLabel, isConnecting };

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
            onClick={onClose}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-0 overflow-y-auto bg-background"
              style={{ touchAction: 'pan-y', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative min-h-full flex flex-col items-center pb-40">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 hover:text-white transition-colors"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                >
                  <X className="h-5 w-5" />
                </button>
                <BiographyContent {...profileProps} isMobile />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative max-w-sm w-full max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl pb-8 pt-2"
            style={{
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white transition-colors"
              style={{ background: 'rgba(0,0,0,0.3)' }}
            >
              <X className="h-4 w-4" />
            </button>
            <BiographyContent {...profileProps} isMobile={false} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
