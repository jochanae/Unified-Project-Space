import { useState, useRef, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Volume2, Loader2, Check, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { VOICE_ROSTER, VoiceOption } from '@/lib/companions';

interface VoiceEntry {
  voice_id: string;
  name: string;
  gender: string;
  accent: string | null;
  age: string | null;
  descriptive: string | null;
  use_case: string | null;
  preview_url: string | null;
  category: string;
}

interface VoiceBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVoiceId?: string;
  companionGender?: string;
  isMinor?: boolean;
  onSelect: (voiceId: string) => void;
}

const GENDER_TABS = [
  { value: '', label: 'All' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'neutral', label: 'Neutral' },
];

const AGE_TABS = [
  { value: '', label: 'Any age' },
  { value: 'young', label: 'Young' },
  { value: 'middle_aged', label: 'Mid' },
  { value: 'old', label: 'Mature' },
];

export default function VoiceBrowser({
  open,
  onOpenChange,
  currentVoiceId,
  companionGender,
  isMinor,
  onSelect,
}: VoiceBrowserProps) {
  const [voices, setVoices] = useState<VoiceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [genderFilter, setGenderFilter] = useState(companionGender || '');
  const [ageFilter, setAgeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(currentVoiceId);
  const [source, setSource] = useState<'library' | 'account' | 'local'>('local');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build local voices from VOICE_ROSTER as fallback/default
  const localVoices: VoiceEntry[] = (() => {
    const ageGroup = isMinor ? 'teen' : 'adult';
    const seen = new Set<string>();
    return VOICE_ROSTER
      .filter(v => {
        if (v.ageGroup !== ageGroup) return false;
        if (seen.has(v.id)) return false;
        seen.add(v.id);
        return true;
      })
      .map(v => ({
        voice_id: v.id,
        name: v.label,
        gender: v.gender,
        accent: null,
        age: null,
        descriptive: v.ethnicity || null,
        use_case: v.vibe.join(', '),
        preview_url: null,
        category: 'curated',
      }));
  })();

  const fetchVoices = useCallback(async (gender?: string, search?: string, age?: string) => {
    setLoading(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-voices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            gender: gender || undefined,
            search: search || undefined,
            age: age || undefined,
            page_size: 40,
          }),
        }
      );
      if (!resp.ok) throw new Error('Failed to fetch');
      const data = await resp.json();
      if (data.voices && data.voices.length > 0) {
        setVoices(data.voices);
        setSource(data.source === 'account' ? 'account' : 'library');
      } else {
        // Fallback to local
        setVoices([]);
        setSource('local');
      }
    } catch {
      setVoices([]);
      setSource('local');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on open — reset gender filter to companion's gender each time
  useEffect(() => {
    if (open) {
      const initialGender = companionGender || '';
      setSelectedId(currentVoiceId);
      setSearchQuery('');
      setGenderFilter(initialGender);
      setAgeFilter('');
      fetchVoices(initialGender || undefined, undefined, undefined);
    }
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [open]);

  // Refetch on gender or age change
  useEffect(() => {
    if (open) {
      fetchVoices(genderFilter || undefined, searchQuery || undefined, ageFilter || undefined);
    }
  }, [genderFilter, ageFilter]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchVoices(genderFilter || undefined, searchQuery || undefined, ageFilter || undefined);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const displayVoices = source === 'local' ? localVoices : voices;

  // Filter local voices by gender tab
  const filteredVoices = source === 'local' && genderFilter
    ? displayVoices.filter(v => v.gender === genderFilter)
    : displayVoices;

  const handlePreview = async (voice: VoiceEntry) => {
    if (previewingId === voice.voice_id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPreviewingId(null);
      return;
    }

    setPreviewingId(voice.voice_id);

    try {
      audioRef.current?.pause();
      audioRef.current = null;

      if (voice.preview_url) {
        // Use the free preview_url from ElevenLabs — no generation cost
        const audio = new Audio(voice.preview_url);
        audioRef.current = audio;
        audio.onended = () => setPreviewingId(null);
        audio.onerror = () => {
          setPreviewingId(null);
          toast.error('Preview unavailable');
        };
        await audio.play();
      } else {
        // Generate preview via companion-voice for local voices
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/companion-voice`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              text: "Hey, it's really nice to meet you. I've been looking forward to this.",
              voiceId: voice.voice_id,
              companionGender: voice.gender,
            }),
          }
        );
        if (!resp.ok) throw new Error('TTS failed');
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setPreviewingId(null);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setPreviewingId(null);
          URL.revokeObjectURL(url);
        };
        await audio.play();
      }
    } catch {
      setPreviewingId(null);
      toast.error('Voice preview failed');
    }
  };

  const handleConfirm = () => {
    if (selectedId) {
      onSelect(selectedId);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85dvh] rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Choose a voice</SheetTitle>
            {!loading && (
              <span className="text-[10px] text-muted-foreground/50">
                {source === 'local' ? 'Curated voices' : source === 'account' ? 'Your ElevenLabs voices' : 'ElevenLabs library'}
              </span>
            )}
          </div>
        </SheetHeader>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search voices..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Gender filter tabs */}
        <div className="flex gap-1.5 px-4 pb-2">
          {GENDER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setGenderFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                genderFilter === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Age filter row — only shown for library results */}
        {source !== 'local' && (
          <div className="flex gap-1.5 px-4 pb-3 items-center">
            <span className="text-[10px] text-muted-foreground/60 font-medium shrink-0">Age:</span>
            {AGE_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setAgeFilter(tab.value)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  ageFilter === tab.value
                    ? 'bg-accent/80 text-accent-foreground'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Voice list */}
        <div className="flex-1 overflow-y-auto px-4 pb-20">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVoices.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              No voices found. Try a different filter.
            </p>
          ) : (
            <div className="space-y-1">
              {filteredVoices.map(voice => {
                const isSelected = selectedId === voice.voice_id;
                const isPreviewing = previewingId === voice.voice_id;

                return (
                  <button
                    key={voice.voice_id}
                    onClick={() => setSelectedId(voice.voice_id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted/30 border border-transparent'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {voice.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {voice.gender && (
                          <span className="text-[10px] bg-muted/60 rounded-full px-1.5 py-0.5 text-muted-foreground capitalize">{voice.gender}</span>
                        )}
                        {voice.accent && (
                          <span className="text-[10px] bg-muted/40 rounded-full px-1.5 py-0.5 text-muted-foreground capitalize">{voice.accent}</span>
                        )}
                        {voice.age && (
                          <span className="text-[10px] text-muted-foreground/60 capitalize">{voice.age.replace('_', ' ')}</span>
                        )}
                        {voice.descriptive && !voice.accent && (
                          <span className="text-[10px] text-muted-foreground capitalize">{voice.descriptive}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handlePreview(voice); }}
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                        title="Preview voice"
                      >
                        {isPreviewing ? (
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        ) : (
                          <Volume2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirm button — fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
          <Button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="w-full rounded-xl h-11"
          >
            {selectedId ? 'Confirm voice' : 'Select a voice'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
