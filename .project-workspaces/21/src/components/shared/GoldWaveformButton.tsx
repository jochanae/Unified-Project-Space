import { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import VoiceBrowser from '@/components/VoiceBrowser';
import { supabase } from '@/integrations/supabase/client';

const WAVEFORM_BARS = [0.6, 1, 0.7, 0.9, 0.5];

const waveformKeyframes = `
@keyframes gwb-bar {
  0% { transform: scaleY(0.4); }
  100% { transform: scaleY(1); }
}`;

interface GoldWaveformButtonProps {
  voiceId?: string;
  companionName: string;
  companionGender: string;
  isMinor?: boolean;
  greetingText?: string;
  onVoiceChange: (voiceId: string) => void;
  /** Compact mode for settings-style inline use */
  compact?: boolean;
}

export default function GoldWaveformButton({
  voiceId,
  companionName,
  companionGender,
  isMinor,
  greetingText,
  onVoiceChange,
  compact = false,
}: GoldWaveformButtonProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const defaultGreeting = greetingText || `Hey, I'm ${companionName}. I'm glad we found each other.`;

  const handlePlay = async () => {
    if (playing) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }

    if (!voiceId) {
      setShowBrowser(true);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Not authenticated');
      }
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/companion-voice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: defaultGreeting,
            voiceId,
            companionGender,
            stream: true,
          }),
        }
      );
      if (!resp.ok) throw new Error('Voice preview failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlaying(true);
      audio.onended = () => {
        setPlaying(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPlaying(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (e) {
      console.error('[GoldWaveform]', e);
      toast.error('Could not play voice preview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{waveformKeyframes}</style>

      <div className={`flex ${compact ? 'items-center gap-3' : 'flex-col items-center gap-2'}`}>
        {/* Waveform play button */}
        <button
          onClick={handlePlay}
          disabled={loading}
          className={`group relative flex items-center justify-center gap-1 rounded-full transition-all border border-primary/30 bg-primary/5 hover:bg-primary/10 active:scale-95 ${
            compact ? 'px-3 py-1.5' : 'px-5 py-2.5'
          }`}
          style={{ minWidth: compact ? 90 : 120 }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary/70" />
          ) : (
            <div className="flex items-center gap-[3px] h-5">
              {WAVEFORM_BARS.map((scale, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-primary/80 transition-all"
                  style={{
                    height: playing ? `${scale * 20}px` : `${scale * 8}px`,
                    animation: playing ? `gwb-bar 0.6s ease-in-out ${i * 0.1}s infinite alternate` : 'none',
                  }}
                />
              ))}
            </div>
          )}
          <span className={`font-medium text-primary/90 ml-1.5 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
            {loading ? 'Loading...' : playing ? 'Playing...' : voiceId ? 'Hear voice' : 'Pick voice'}
          </span>
        </button>

        {/* Change voice link */}
        <button
          onClick={() => setShowBrowser(true)}
          className={`text-white/40 hover:text-primary/70 transition-colors underline underline-offset-2 decoration-white/20 hover:decoration-primary/40 ${
            compact ? 'text-[10px]' : 'text-[11px]'
          }`}
        >
          {voiceId ? 'Change voice' : 'Try other voices'}
        </button>
      </div>

      <VoiceBrowser
        open={showBrowser}
        onOpenChange={setShowBrowser}
        currentVoiceId={voiceId}
        companionGender={companionGender}
        isMinor={isMinor}
        onSelect={onVoiceChange}
      />
    </>
  );
}
