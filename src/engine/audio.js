// ============================================================
//  AUDIO — simple Web Audio synth
// ============================================================
let ctx;

function ensure() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function play(freq, duration, type = 'square', vol = 0.1) {
  const c = ensure();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export const GameAudio = {
  hit() { play(200, 0.15, 'sawtooth', 0.12); play(80, 0.2, 'square', 0.08); },
  miss() { play(120, 0.1, 'sine', 0.06); },
  hurt() { play(100, 0.3, 'sawtooth', 0.15); play(60, 0.4, 'square', 0.1); },
  pickup() { play(600, 0.08, 'sine', 0.1); play(900, 0.1, 'sine', 0.08); },
  descend() { play(300, 0.2, 'sine', 0.1); play(200, 0.3, 'sine', 0.08); play(100, 0.5, 'sine', 0.06); },
  step() { play(50 + Math.random() * 30, 0.05, 'triangle', 0.03); },
  door() {
    // Creaky hinge
    play(300, 0.15, 'sawtooth', 0.06);
    play(250, 0.2, 'sawtooth', 0.05);
    // Heavy stone/wood thud
    play(80, 0.4, 'triangle', 0.12);
    play(50, 0.5, 'sine', 0.08);
  },
};
