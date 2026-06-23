// Bloom SFX + Haptics — ported from Compani's "Sanctuary" suite
// Procedural Web Audio (no asset files) + 3-stage signature send haptic

let audioCtx: AudioContext | null = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); }
    catch { return null; }
  }
  if (audioCtx?.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// Unlock audio on first gesture (mobile requirement)
let unlocked = false;
function unlock() {
  if (unlocked) return;
  unlocked = true;
  getCtx();
  document.removeEventListener("touchstart", unlock, true);
  document.removeEventListener("click", unlock, true);
}
if (typeof document !== "undefined") {
  document.addEventListener("touchstart", unlock, true);
  document.addEventListener("click", unlock, true);
}

function sfxEnabled() {
  try { return localStorage.getItem("quinn-sfx-enabled") !== "false"; } catch { return true; }
}
function hapticEnabled() {
  try { return localStorage.getItem("quinn-haptic-enabled") !== "false"; } catch { return true; }
}

function vib(p: number | number[]) {
  if (!hapticEnabled()) return;
  try { navigator.vibrate?.(p as any); } catch { /* */ }
}

// ── Sounds ──────────────────────────────────────────────

/** Silk whoosh on send */
export function playSendWhoosh() {
  if (!sfxEnabled()) return;
  const ctx = getCtx(); if (!ctx) return;
  try {
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.15);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.6);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.7);
  } catch { /* */ }
}

/** Cello pluck — "held with care" 500ms after send */
export function playHeldWithCare() {
  if (!sfxEnabled()) return;
  const ctx = getCtx(); if (!ctx) return;
  try {
    const o1 = ctx.createOscillator(); o1.type = "sine";
    o1.frequency.setValueAtTime(130.8, ctx.currentTime);
    o1.frequency.exponentialRampToValueAtTime(128, ctx.currentTime + 0.8);
    const o2 = ctx.createOscillator(); o2.type = "triangle";
    o2.frequency.setValueAtTime(261.6, ctx.currentTime);
    const g1 = ctx.createGain(); g1.gain.setValueAtTime(0.08, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.03, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    const f = ctx.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(600, ctx.currentTime);
    f.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 1);
    o1.connect(g1).connect(f).connect(ctx.destination);
    o2.connect(g2).connect(f);
    o1.start(); o2.start();
    o1.stop(ctx.currentTime + 1.3); o2.stop(ctx.currentTime + 1);
  } catch { /* */ }
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.07) {
  if (!sfxEnabled()) return;
  const ctx = getCtx(); if (!ctx) return;
  try {
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch { /* */ }
}

// ── Haptic profiles ─────────────────────────────────────

/** 3-stage signature send haptic: catch → dissolve → heartbeat */
export function quinnSendHaptic() {
  vib(10);
  setTimeout(() => vib(8), 120);
  setTimeout(() => vib(6), 220);
  setTimeout(() => vib(4), 310);
  setTimeout(() => vib([35, 60, 35]), 500);
}

/** Soft confirmation pulse */
export function softConfirmHaptic() { vib(12); }

/** Privacy lock toggle */
export function privacyShieldHaptic() { vib([12, 30, 8]); }

// ── Public composite cues ───────────────────────────────

export function sfxMessageSent() {
  quinnSendHaptic();
  playSendWhoosh();
  setTimeout(() => playHeldWithCare(), 500);
}

export function sfxMessageReceived() {
  softConfirmHaptic();
  tone(660, 0.12, "triangle", 0.07);
  setTimeout(() => tone(880, 0.08, "sine", 0.05), 60);
}

export function sfxNavTap() { vib(6); tone(700, 0.06, "sine", 0.05); }
