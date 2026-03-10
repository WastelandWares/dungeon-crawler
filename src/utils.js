// ============================================================
//  UTILITY
// ============================================================
export function roll(n, d) {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.floor(Math.random() * d) + 1;
  return sum;
}

export function d20() { return Math.floor(Math.random() * 20) + 1; }

export function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

export function lerp(a, b, t) { return a + (b - a) * t; }

export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
