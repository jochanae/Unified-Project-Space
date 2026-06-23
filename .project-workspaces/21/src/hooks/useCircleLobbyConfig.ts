import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LobbyConfig {
  id?: string;
  circle_id: string;
  welcome_message: string | null;
  video_url: string | null;
  music_url: string | null;
  handouts: { label: string; url: string }[];
  guestbook_enabled: boolean;
  arrival_suggestions: string[];
}

const DEFAULT_SUGGESTIONS = [
  'Excited to be here!',
  'Ready to connect ✨',
  'Just vibing 🎶',
  'First time here 👋',
];

export function useCircleLobbyConfig(circleId: string | undefined) {
  const [config, setConfig] = useState<LobbyConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!circleId) { setLoading(false); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from('circle_lobby_config' as any)
        .select('*')
        .eq('circle_id', circleId)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setConfig({
          id: d.id,
          circle_id: d.circle_id,
          welcome_message: d.welcome_message,
          video_url: d.video_url,
          music_url: d.music_url,
          handouts: (d.handouts as any[]) || [],
          guestbook_enabled: d.guestbook_enabled ?? true,
          arrival_suggestions: (d.arrival_suggestions as string[]) || DEFAULT_SUGGESTIONS,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [circleId]);

  const saveConfig = useCallback(async (partial: Partial<Omit<LobbyConfig, 'id' | 'circle_id'>>) => {
    if (!circleId) return;
    const payload = {
      circle_id: circleId,
      ...partial,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await (supabase as any)
      .from('circle_lobby_config')
      .upsert(payload, { onConflict: 'circle_id' })
      .select()
      .single();
    if (!error && data) {
      setConfig({
        id: data.id,
        circle_id: data.circle_id,
        welcome_message: data.welcome_message,
        video_url: data.video_url,
        music_url: data.music_url,
        handouts: (data.handouts as any[]) || [],
        guestbook_enabled: data.guestbook_enabled ?? true,
        arrival_suggestions: (data.arrival_suggestions as string[]) || DEFAULT_SUGGESTIONS,
      });
    }
    return { data, error };
  }, [circleId]);

  return { config, loading, saveConfig };
}
