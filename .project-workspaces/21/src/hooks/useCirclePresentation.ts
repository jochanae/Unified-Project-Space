import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toEmbedUrl } from '@/lib/presentationUrl';
import { toast } from 'sonner';

interface UseCirclePresentationParams {
  circleId: string | undefined;
  localParticipantId: string;
  userId: string | undefined;
}

export function useCirclePresentation({ circleId, localParticipantId, userId }: UseCirclePresentationParams) {
  const [isPresentationActive, setIsPresentationActive] = useState(false);
  const [presenterId, setPresenterId] = useState<string | null>(null);
  const [presentationSlides, setPresentationSlides] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [presentationMode, setPresentationMode] = useState<'iframe' | 'image'>('iframe');
  const [showPresentDialog, setShowPresentDialog] = useState(false);
  const [presentUrlInput, setPresentUrlInput] = useState('');
  const [focusMode, setFocusMode] = useState(false);

  // Broadcast listener
  useEffect(() => {
    if (!circleId) return;
    const channel = supabase.channel(`circle-presentation-${circleId}`);
    channel
      .on('broadcast', { event: 'presentation:start' }, ({ payload }) => {
        if (payload) {
          setPresentationSlides(payload.slides || []);
          setPresentationMode(payload.mode || 'iframe');
          setPresenterId(payload.presenterId || null);
          setCurrentSlide(0);
          setIsPresentationActive(true);
          setFocusMode(true);
        }
      })
      .on('broadcast', { event: 'presentation:slide' }, ({ payload }) => {
        if (payload && typeof payload.currentSlide === 'number') {
          setCurrentSlide(payload.currentSlide);
        }
      })
      .on('broadcast', { event: 'presentation:stop' }, () => {
        setIsPresentationActive(false);
        setPresenterId(null);
        setPresentationSlides([]);
        setCurrentSlide(0);
        setFocusMode(false);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [circleId]);

  const broadcastSlideChange = useCallback((idx: number) => {
    setCurrentSlide(idx);
    if (circleId) {
      supabase.channel(`circle-presentation-${circleId}`).send({
        type: 'broadcast', event: 'presentation:slide', payload: { currentSlide: idx },
      });
    }
  }, [circleId]);

  const stopPresenting = useCallback(() => {
    setIsPresentationActive(false);
    setPresenterId(null);
    setPresentationSlides([]);
    setCurrentSlide(0);
    setFocusMode(false);
    if (circleId) {
      supabase.channel(`circle-presentation-${circleId}`).send({
        type: 'broadcast', event: 'presentation:stop', payload: {},
      });
    }
  }, [circleId]);

  const startPresenting = useCallback(() => {
    const url = toEmbedUrl(presentUrlInput.trim());
    if (!url) return;
    const slides = [url];
    const pMode = 'iframe';
    setPresentationSlides(slides);
    setPresentationMode(pMode);
    setCurrentSlide(0);
    setPresenterId(localParticipantId || userId || null);
    setIsPresentationActive(true);
    setFocusMode(true);
    setShowPresentDialog(false);
    setPresentUrlInput('');
    toast.success('Presenting! 🖥️');
    if (circleId) {
      supabase.channel(`circle-presentation-${circleId}`).send({
        type: 'broadcast', event: 'presentation:start',
        payload: { slides, mode: pMode, presenterId: localParticipantId || userId },
      });
    }
  }, [circleId, presentUrlInput, localParticipantId, userId]);

  /** Toggle present on/off — opens dialog or stops */
  const togglePresent = useCallback(() => {
    if (isPresentationActive) {
      stopPresenting();
    } else {
      setShowPresentDialog(true);
    }
  }, [isPresentationActive, stopPresenting]);

  return {
    isPresentationActive,
    presenterId,
    presentationSlides,
    currentSlide,
    presentationMode,
    showPresentDialog,
    presentUrlInput,
    focusMode,
    setFocusMode,
    setShowPresentDialog,
    setPresentUrlInput,
    broadcastSlideChange,
    stopPresenting,
    startPresenting,
    togglePresent,
  };
}
