import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Plays a background music URL (YouTube, SoundCloud, or direct audio)
 * when participants enter a Circle room.
 * Respects browser autoplay policies by starting muted and fading in.
 */
export function useAmbientMusic(musicUrl: string | null | undefined) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.15);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlaying(false);
  }, []);

  // Resolve the playable URL (direct mp3/ogg or proxy for streaming platforms)
  const resolveUrl = useCallback((url: string): string | null => {
    try {
      const u = new URL(url);
      // Direct audio files — play as-is
      if (/\.(mp3|ogg|wav|m4a|aac|webm|flac)(\?|$)/i.test(u.pathname)) {
        return url;
      }
      // For now, only support direct audio URLs
      // YouTube/SoundCloud would need a server-side proxy
      return url;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!musicUrl) { cleanup(); return; }

    const playableUrl = resolveUrl(musicUrl);
    if (!playableUrl) return;

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    audio.volume = 0; // start silent, fade in
    audio.src = playableUrl;
    audioRef.current = audio;

    const fadeIn = () => {
      let v = 0;
      const step = () => {
        v = Math.min(v + 0.01, volume);
        if (audioRef.current) audioRef.current.volume = v;
        if (v < volume) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      setPlaying(true);
    };

    // Try autoplay (may be blocked by browser policy)
    audio.play()
      .then(fadeIn)
      .catch(() => {
        // Autoplay blocked — listen for first user interaction to start
        const resume = () => {
          audio.play().then(fadeIn).catch(() => {});
          document.removeEventListener('click', resume);
          document.removeEventListener('keydown', resume);
        };
        document.addEventListener('click', resume, { once: true });
        document.addEventListener('keydown', resume, { once: true });
      });

    return cleanup;
  }, [musicUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync volume changes
  useEffect(() => {
    if (audioRef.current && playing) {
      audioRef.current.volume = volume;
    }
  }, [volume, playing]);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [playing]);

  return { playing, toggle, volume, setVolume, cleanup };
}
