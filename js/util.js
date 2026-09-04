/* Small, dependency-free helpers. Everything here is pure. */

export const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export const money = n => n === 0 ? 'Free'
  : '$' + (n % 1 === 0 ? n : n.toFixed(2));

/* money() says "Free" at zero, which is right for a ticket and wrong for a
   payout, a total or a balance. Those use this. */
export const amount = n => '$' + (n % 1 === 0 ? n : n.toFixed(2));

/* Deterministic pseudo-randomness — the same city always generates the same
   catalogue, so a demo never contradicts itself between reloads. */
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

/* Apple's momentum projection (Designing Fluid Interfaces sample code).
   Not the textbook v²/2a — this exponential-decay form is what iOS ships. */
export const project = (velocity, decel = 0.998) =>
  (velocity / 1000) * decel / (1 - decel);

/* Progressive resistance past a boundary. A hard stop reads as frozen. */
export function rubberband(overshoot, dimension, c = 0.55) {
  return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
}

/* Tracks the last few pointer samples so release velocity is real, not a
   two-point guess that a single stuttered frame can wreck. */
export class Velocity {
  constructor(window = 5) { this.w = window; this.s = []; }
  add(v, t = performance.now()) {
    this.s.push({ v, t });
    while (this.s.length > this.w) this.s.shift();
  }
  get() {
    if (this.s.length < 2) return 0;
    const a = this.s[0], b = this.s[this.s.length - 1];
    const dt = b.t - a.t;
    return dt > 0 ? (b.v - a.v) / dt * 1000 : 0;   // px/s
  }
  reset() { this.s.length = 0; }
}

export const raf = fn => requestAnimationFrame(fn);
export const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export const reduceMotion = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;

export const el = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

/* "3 friends going" without the off-by-one that reads as a bug */
export const plural = (n, one, many) => n === 1 ? one : (many || one + 's');

export function compact(n) {
  if (typeof n === 'string') return n;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

export const initials = name => name.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
