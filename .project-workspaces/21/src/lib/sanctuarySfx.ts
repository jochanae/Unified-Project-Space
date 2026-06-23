// Sanctuary interactive sound cues — procedural Web Audio
// Syncs with Golden Dissolve, Held with care, and Dashboard Bloom

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function isEnabled() {
  return localStorage.getItem('compani-sfx-enabled') !== 'false';
}

/** Soft "whoosh" — like wind through silk. Plays on message send. */
export function playSendWhoosh() {
  if (!isEnabled()) return;
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate;
    const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) d[i] = (Math.random() * 2 - 1);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.15);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.6);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + 0.7);
  } catch { /* non-critical */ }
}

/** Deep resonant "cello pluck" — confirms companion has "caught" the thought. */
export function playHeldWithCare() {
  if (!isEnabled()) return;
  try {
    const ctx = getCtx();
    // Low fundamental
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130.8, ctx.currentTime); // C3
    osc.frequency.exponentialRampToValueAtTime(128, ctx.currentTime + 0.8);

    // Harmonics for richness
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(261.6, ctx.currentTime); // C4

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.03, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 1);

    osc.connect(gain).connect(filter).connect(ctx.destination);
    osc2.connect(gain2).connect(filter);
    osc.start();
    osc2.start();
    osc.stop(ctx.currentTime + 1.3);
    osc2.stop(ctx.currentTime + 1);
  } catch { /* non-critical */ }
}

/** Crystalline ascending chime — signals transition to wider world. */
export function playDashboardChime() {
  if (!isEnabled()) return;
  try {
    const ctx = getCtx();
    const notes = [1047, 1319, 1568, 2093]; // C6 E6 G6 C7
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.04 - i * 0.005, ctx.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.6);
    });
  } catch { /* non-critical */ }
}
