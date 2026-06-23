/**
 * Tactile feedback helpers — Sanctuary's "felt response" layer.
 *
 * - haptic(): short vibration on devices that support it (Android/most browsers).
 *   iOS Safari ignores Navigator.vibrate; the call is a silent no-op there.
 * - chime(): brief, soft Web Audio tone. No assets, no network. Designed to be
 *   barely-there ("Selah" sigh, not a notification ping).
 *
 * Both are intentionally side-effect-free if the browser doesn't support them
 * or if the user has reduced-motion / silenced the page.
 */

type HapticPattern = "tap" | "send" | "success" | "warn";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 8,
  send: [12, 30, 18],
  success: [10, 40, 14, 40, 22],
  warn: [40, 30, 40],
};

export function haptic(pattern: HapticPattern = "tap"): void {
  try {
    if (typeof navigator === "undefined") return;
    const v = (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate;
    if (typeof v === "function") {
      const p = PATTERNS[pattern];
      v.call(navigator, Array.isArray(p) ? p : [p]);
    }
  } catch {
    /* noop */
  }
}

let _ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (_ctx && _ctx.state !== "closed") return _ctx;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    _ctx = new Ctor();
    return _ctx;
  } catch {
    return null;
  }
}

type ChimeTone = "send" | "receive" | "soft";

const TONES: Record<ChimeTone, { freq: number; dur: number; gain: number }> = {
  // Soft mid-air "whoosh" — a gentle G5 hint.
  send: { freq: 784, dur: 0.12, gain: 0.04 },
  // A higher answering note — D6.
  receive: { freq: 1175, dur: 0.16, gain: 0.035 },
  soft: { freq: 660, dur: 0.1, gain: 0.03 },
};

export function chime(tone: ChimeTone = "soft"): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const { freq, dur, gain } = TONES[tone];
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  } catch {
    /* noop */
  }
}

/** Combined: tactile pulse + audible cue. Use on confirmed user actions. */
export function pulse(tone: ChimeTone = "send", pattern: HapticPattern = "send"): void {
  haptic(pattern);
  chime(tone);
}
