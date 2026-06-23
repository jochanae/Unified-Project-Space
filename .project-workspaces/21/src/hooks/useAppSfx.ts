// App-wide sound effects & haptic feedback using Web Audio API
// Procedurally generated tones — no external audio files needed
// Integrates Sanctuary-grade SFX + haptics for a premium feel

import { playSendWhoosh, playHeldWithCare } from '@/lib/sanctuarySfx';
import { sanctuarySendHaptic, softConfirmHaptic } from '@/lib/sanctuaryHaptics';

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  // Resume suspended context (mobile browsers require user gesture)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Unlock audio on first user interaction (mobile PWA requirement)
let unlocked = false;
function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  getCtx(); // creates & resumes
  document.removeEventListener('touchstart', unlockAudio, true);
  document.removeEventListener('click', unlockAudio, true);
}
if (typeof document !== 'undefined') {
  document.addEventListener('touchstart', unlockAudio, true);
  document.addEventListener('click', unlockAudio, true);
}

function vibrate(pattern: number | number[]) {
  try {
    if (localStorage.getItem('compani-haptic-enabled') === 'false') return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch { /* not all browsers support vibrate */ }
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.1) {
  try {
    if (localStorage.getItem('compani-sfx-enabled') === 'false') return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch { /* audio is non-critical */ }
}

/** Sanctuary-grade message send — whoosh + 3-stage haptic + delayed cello pluck */
export function sfxMessageSent() {
  // Signature haptic: catch → dissolve → heartbeat
  sanctuarySendHaptic();
  // Audio: silk whoosh on send, cello pluck 500ms later ("held with care")
  playSendWhoosh();
  setTimeout(() => playHeldWithCare(), 500);
}

/** Gentle confirmation — message/reply received with soft haptic pulse */
export function sfxMessageReceived() {
  softConfirmHaptic();
  playTone(660, 0.12, 'triangle', 0.07);
  setTimeout(() => playTone(880, 0.08, 'sine', 0.05), 60);
}

/** Subtle tick — navigation tap */
export function sfxNavTap() {
  vibrate(6);
  playTone(700, 0.06, 'sine', 0.05);
}

/** Soft alert chime — toast / notification */
export function sfxNotification() {
  vibrate([8, 30, 8]);
  playTone(880, 0.15, 'sine', 0.07);
  setTimeout(() => playTone(1100, 0.12, 'sine', 0.05), 100);
  setTimeout(() => playTone(1320, 0.1, 'sine', 0.04), 200);
}

// ── Voice Call SFX ──────────────────────────────────

let ringInterval: ReturnType<typeof setInterval> | null = null;

/** Repeating ring tone while connecting — call sfxRingStop() to end */
export function sfxRingStart() {
  sfxRingStop(); // clear any existing
  const ring = () => {
    playTone(440, 0.15, 'sine', 0.09);
    setTimeout(() => playTone(554, 0.15, 'sine', 0.09), 180);
    setTimeout(() => {
      playTone(440, 0.15, 'sine', 0.09);
      setTimeout(() => playTone(554, 0.15, 'sine', 0.09), 180);
    }, 400);
    vibrate([60, 120, 60]);
  };
  ring();
  ringInterval = setInterval(ring, 2400);
}

export function sfxRingStop() {
  if (ringInterval) { clearInterval(ringInterval); ringInterval = null; }
}

/** Warm chime — call connected */
export function sfxCallConnected() {
  sfxRingStop();
  vibrate([15, 40, 15]);
  playTone(523, 0.18, 'sine', 0.1);
  setTimeout(() => playTone(659, 0.16, 'sine', 0.09), 120);
  setTimeout(() => playTone(784, 0.22, 'sine', 0.08), 240);
}

/** Soft descending tone — call ended */
export function sfxCallEnded() {
  sfxRingStop();
  vibrate(20);
  playTone(660, 0.15, 'sine', 0.08);
  setTimeout(() => playTone(440, 0.2, 'sine', 0.06), 140);
  setTimeout(() => playTone(330, 0.25, 'triangle', 0.04), 300);
}

/** Hook for convenient destructured access */
export function useAppSfx() {
  return {
    messageSent: sfxMessageSent,
    messageReceived: sfxMessageReceived,
    navTap: sfxNavTap,
    notification: sfxNotification,
    ringStart: sfxRingStart,
    ringStop: sfxRingStop,
    callConnected: sfxCallConnected,
    callEnded: sfxCallEnded,
  };
}
