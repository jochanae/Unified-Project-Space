// Onboarding haptic + audio feedback utility
import { logger } from '@/utils/logger';
// Procedurally generated tones via Web Audio API — no files needed

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function vibrate(ms: number) {
  try {
    if (localStorage.getItem('compani-haptic-enabled') === 'false') return;
    navigator.vibrate?.(ms);
  } catch (e) { logger.warn("[OnboardingSfx] Sound failed:", e); }
}

function tone(freq: number, decay: number, volume: number) {
  try {
    if (localStorage.getItem('compani-sfx-enabled') === 'false') return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decay / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + decay / 1000);
  } catch (e) { logger.warn("[OnboardingSfx] Sound failed:", e); }
}

export function playSelectSound(type: 'select' | 'deselect' | 'confirm') {
  switch (type) {
    case 'select':
      vibrate(35);
      tone(520, 80, 0.08);
      break;
    case 'deselect':
      vibrate(15);
      tone(380, 80, 0.08);
      break;
    case 'confirm':
      vibrate(50);
      tone(440, 120, 0.1);
      break;
  }
}
