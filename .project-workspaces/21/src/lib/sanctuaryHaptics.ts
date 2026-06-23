// Sanctuary-grade haptic profiles — signature tactile feedback
// Respects the haptic mode set in SoundSuitePanel (localStorage 'compani-haptic-mode')
import type { HapticMode } from '@/components/SoundSuitePanel';

function getMode(): HapticMode {
  return (localStorage.getItem('compani-haptic-mode') as HapticMode) || 'whisper';
}

function getIntensity(): number {
  const v = localStorage.getItem('compani-haptic-intensity');
  return v ? Number(v) / 100 : 0.7;
}

function vib(ms: number | number[]) {
  const intensity = getIntensity();
  try {
    if (Array.isArray(ms)) {
      navigator.vibrate?.(ms.map(v => Math.max(1, Math.round(v * intensity))));
    } else {
      navigator.vibrate?.(Math.max(1, Math.round(ms * intensity)));
    }
  } catch { /* */ }
}

/**
 * The "Sanctuary Send" — 3-stage signature haptic for the Golden Dissolve flow.
 * 1. Catch (0ms): sharp light pre-tick
 * 2. Dissolve (100-400ms): micro-ticks decreasing in intensity
 * 3. Settling (500ms): deep heartbeat double-pulse — synced with "Held with care"
 */
export function sanctuarySendHaptic() {
  const mode = getMode();
  if (mode === 'silent') return;

  if (mode === 'whisper') {
    // Light single tap on catch only
    vib(10);
    return;
  }

  // Deep Connection — full signature sequence
  // 1. The Catch
  vib(10);

  // 2. The Dissolve — decreasing micro-ticks
  setTimeout(() => vib(8), 120);
  setTimeout(() => vib(6), 220);
  setTimeout(() => vib(4), 310);

  // 3. The Settling — heartbeat (thump-thump)
  setTimeout(() => vib([35, 60, 35]), 500);
}

/** Privacy shield tap — crisp vault-door click */
export function privacyShieldHaptic() {
  const mode = getMode();
  if (mode === 'silent') return;
  if (mode === 'whisper') { vib(8); return; }
  vib([12, 30, 8]);
}

/** Gentle confirmation pulse for UI interactions */
export function softConfirmHaptic() {
  const mode = getMode();
  if (mode === 'silent') return;
  vib(mode === 'whisper' ? 6 : 12);
}

/** Closing Ritual — reverse heartbeat: one deep, slow "vault-door settling" pulse */
export function closingRitualHaptic() {
  const mode = getMode();
  if (mode === 'silent') return;
  if (mode === 'whisper') { vib(15); return; }
  // Deep slow pulse — heavy door settling into frame
  vib([50, 100, 25]);
}

/** Reveal — crisp, high-frequency click: the glass lifts */
export function revealHaptic() {
  const mode = getMode();
  if (mode === 'silent') return;
  vib(mode === 'whisper' ? 8 : 15);
}

/** Veil — soft, dampened thud: a heavy curtain settling back into place */
export function veilHaptic() {
  const mode = getMode();
  if (mode === 'silent') return;
  if (mode === 'whisper') { vib(20); return; }
  // Low-frequency thud — lid settling onto glass
  vib([30, 50, 15]);
}
