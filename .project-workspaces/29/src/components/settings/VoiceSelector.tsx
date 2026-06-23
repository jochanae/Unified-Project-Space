import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Volume2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Diverse selection of ElevenLabs voices
export const QUINN_VOICES = [
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Warm, professional male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Clear, articulate female' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Calm, reassuring female' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Warm, expressive female' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', description: 'Friendly, conversational female' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'Warm, professional female' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Gentle, soothing female' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Friendly, energetic male' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Authoritative, clear male' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', description: 'Friendly, relatable male' },
] as const;

const STORAGE_KEY = 'quinn_voice_preference';

export function getStoredVoiceId(): string {
  if (typeof window === 'undefined') return QUINN_VOICES[0].id;
  return localStorage.getItem(STORAGE_KEY) || QUINN_VOICES[0].id;
}

export function VoiceSelector() {
  const [voiceId, setVoiceId] = useState(getStoredVoiceId);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, voiceId);
  }, [voiceId]);

  const handleTestVoice = async () => {
    setIsTesting(true);
    try {
      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Please sign in to preview voices');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            text: 'Hello! I am Quinn, your personal money mentor. How can I help you today?',
            voiceId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Voice preview error:', errorData);
        throw new Error(errorData.error || 'Failed to generate preview');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();
    } catch (err) {
      console.error('Voice preview error:', err);
      toast.error('Unable to preview voice. Please try again.');
    } finally {
      setIsTesting(false);
    }
  };

  const selectedVoice = QUINN_VOICES.find((v) => v.id === voiceId) || QUINN_VOICES[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Quinn's Voice
        </CardTitle>
        <CardDescription>
          Choose the voice you'd like Quinn to use when speaking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={voiceId} onValueChange={setVoiceId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              {QUINN_VOICES.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  <span className="font-medium">{voice.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    — {voice.description}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleTestVoice} disabled={isTesting}>
            {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
            <span className="ml-2">Preview</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Current: <span className="font-medium">{selectedVoice.name}</span> — {selectedVoice.description}
        </p>
      </CardContent>
    </Card>
  );
}
