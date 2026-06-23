/**
 * useStrategistMode — observes recent user messages and emits an
 * `active` flag when high-stakes signals (finance, career, life,
 * stakes/intent/ownership/risk) cross the activation threshold.
 *
 * Universal — fires for every user, free or paid. Visual signal in
 * chat is the upgrade hook; the templates behind it are gated.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  detectStrategistMode,
  shouldDecayStrategistMode,
} from '@/lib/strategistDetection';

interface MessageLike {
  role: string;
  content: string;
}

export function useStrategistMode(messages: MessageLike[]): {
  active: boolean;
  hits: string[];
  score: number;
} {
  const [active, setActive] = useState(false);
  const lastActivationLengthRef = useRef(0);

  const recentUserMessages = useMemo(
    () =>
      messages
        .filter((m) => m.role === 'user' && typeof m.content === 'string')
        .map((m) => m.content)
        .slice(-8),
    [messages],
  );

  const detection = useMemo(
    () => detectStrategistMode(recentUserMessages),
    [recentUserMessages],
  );

  useEffect(() => {
    // Activation
    if (detection.active && !active) {
      setActive(true);
      lastActivationLengthRef.current = recentUserMessages.length;
      return;
    }

    // Decay — only check if currently active and at least 2 new messages
    // have arrived since activation.
    if (
      active &&
      recentUserMessages.length - lastActivationLengthRef.current >= 2 &&
      shouldDecayStrategistMode(recentUserMessages)
    ) {
      setActive(false);
    }
  }, [detection.active, recentUserMessages, active]);

  return { active, hits: detection.hits, score: detection.score };
}
