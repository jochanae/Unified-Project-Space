// Pre-baked studio sound effects using Web Audio API + haptic feedback
// No external files needed — generates tones procedurally

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function vibrate(pattern: number | number[]) {
  try {
    if (localStorage.getItem('compani-haptic-enabled') === 'false') return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch { /* not all browsers support vibrate */ }
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.12) {
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
  } catch { /* silently fail — audio is non-critical */ }
}

export function useStudioSfx() {
  const tapSelect = () => {
    vibrate(10);
    playTone(880, 0.08, 'sine', 0.1);
    setTimeout(() => playTone(1100, 0.06, 'sine', 0.08), 40);
  };

  const tabSwitch = () => {
    vibrate(6);
    playTone(600, 0.1, 'triangle', 0.06);
  };

  const sparkle = () => {
    vibrate([8, 30, 8, 30, 8]);
    playTone(1200, 0.15, 'sine', 0.08);
    setTimeout(() => playTone(1500, 0.12, 'sine', 0.06), 80);
    setTimeout(() => playTone(1800, 0.1, 'sine', 0.05), 160);
  };

  const celebration = () => {
    vibrate([15, 40, 15, 40, 15, 40, 30, 60, 50]);
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sine', 0.1), i * 100);
    });
    // Add shimmer
    setTimeout(() => {
      playTone(1568, 0.4, 'sine', 0.06);
      playTone(2093, 0.5, 'sine', 0.04);
    }, 500);
  };

  /** Race countdown beep — call with 3, 2, 1, 0 (GO) */
  const raceCountdown = (n: number) => {
    vibrate(n === 0 ? [20, 30, 20] : 12);
    if (n > 0) {
      const freq = 440 + (3 - n) * 110;
      playTone(freq, 0.18, 'square', 0.08 + (3 - n) * 0.02);
    } else {
      playTone(523, 0.25, 'square', 0.12);
      playTone(659, 0.25, 'square', 0.1);
      playTone(784, 0.3, 'sine', 0.08);
    }
  };

  /** Victory fanfare — triumphant ascending arpeggio with sparkle */
  const raceWin = () => {
    vibrate([20, 40, 20, 40, 20, 40, 40, 80, 60]);
    const fanfare = [523, 659, 784, 1047];
    fanfare.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.35, 'sine', 0.12), i * 120);
    });
    setTimeout(() => {
      playTone(1568, 0.5, 'sine', 0.07);
      playTone(2093, 0.6, 'sine', 0.05);
      playTone(2637, 0.4, 'sine', 0.04);
    }, 550);
    setTimeout(() => {
      playTone(1047, 0.8, 'triangle', 0.06);
      playTone(1319, 0.8, 'triangle', 0.04);
    }, 750);
  };

  return { tapSelect, tabSwitch, sparkle, celebration, raceCountdown, raceWin };
}
