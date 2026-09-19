/* ============================================================================
   POSTER ART

   Every cover in this app is drawn, not photographed — the same six crowd
   shots repeated down a feed belong to no brand, and a stock CDN dies in a
   sandbox and offline.

   MONOCHROME. The fifteen category hues this replaced were eleven verbatim
   Tailwind defaults plus one four-points-from-Ember clone, which is a palette
   a branding founder spots in two seconds and not a brand. Identity comes from
   the COMPOSITION and its seed, so a given event looks the same on every device
   and forever, and nobody has to notice that Markets renders brighter than
   Nightlife for a reason they cannot name.

   THE POSTER AUTHORS AGAINST ITS TARGET RATIO. It used to be drawn for a
   400×268 box and sliced into everything up to a 400×560 hero, which threw away
   most of the composition and left 52% of the hero empty. poster() now takes
   the aspect it will be shown at and draws for it.
   ========================================================================== */

import { hashStr, rng } from "./util.js";

/* The ground: a vertical duotone, near-black and genuinely NEUTRAL. The first
   pass used #1C1926, which is thirteen points apart across its channels — a
   blue-violet that reads as a hue at the bottom of every poster. Monochrome
   has to survive being measured. */
const DEEP = "#0E0D10";
const LIFT = "#1C1B20";

/* One ink, three strengths and a hairline. That is the whole poster palette.
   Tuned at 64px, not at the plate: an opacity that reads as a composition on a
   240px plate is an empty grey square on a thumbnail, and the thumbnail is
   where this art is seen eighteen times a screen. */
const A1 = ".10", A2 = ".16", A3 = ".26", HAIR = ".34";
const B = "#F4F1EC";

/* Six compositions. Each is one idea, drawn against the box it is given, so
   nothing important depends on a crop that no longer happens. */
const COMPOSITIONS = [
  /* 0 — a shaft of light across the frame: the beam over a dance floor */
  (r, W, H) => {
    const x = W * (0.08 + r() * 0.5), w = W * (0.14 + r() * 0.22), skew = W * (0.1 + r() * 0.26);
    return `
      <path d="M${x} ${-H * 0.1} L${x + w} ${-H * 0.1} L${x + w + skew} ${H * 1.1} L${x + skew} ${H * 1.1} Z"
        fill="${B}" opacity="${A2}"/>
      <path d="M${x + w * 1.5} ${-H * 0.1} L${x + w * 1.9} ${-H * 0.1} L${x + w * 1.9 + skew} ${H * 1.1} L${x + w * 1.5 + skew} ${H * 1.1} Z"
        fill="${B}" opacity="${A1}"/>
      <path d="M0 ${(H * (0.55 + r() * 0.25)).toFixed(1)} H${W}"
        stroke="${B}" stroke-width="1" opacity="${HAIR}"/>`;
  },

  /* 1 — a horizon with a disc breaking it */
  (r, W, H) => {
    const y = H * (0.42 + r() * 0.22), cx = W * (0.16 + r() * 0.68);
    const rad = Math.min(W, H) * (0.16 + r() * 0.14);
    return `
      <circle cx="${cx.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="${B}" opacity="${A2}"/>
      <circle cx="${cx.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="none"
        stroke="${B}" stroke-width="1.2" opacity="${HAIR}"/>
      <path d="M0 ${y.toFixed(1)} H${W} V${H} H0 Z" fill="${B}" opacity="${A1}"/>
      <path d="M0 ${y.toFixed(1)} H${W}" stroke="${B}" stroke-width="1.2" opacity="${HAIR}"/>`;
  },

  /* 2 — a skyline of bars, one of them lit */
  (r, W, H) => {
    const n = 7 + Math.floor(r() * 5), bw = W / n, lit = Math.floor(r() * n);
    let out = "";
    for (let i = 0; i < n; i++) {
      const h = H * (0.18 + r() * 0.5);
      out += `<rect x="${(i * bw + bw * 0.12).toFixed(1)}" y="${(H - h).toFixed(1)}"
        width="${(bw * 0.76).toFixed(1)}" height="${h.toFixed(1)}"
        fill="${B}" opacity="${i === lit ? A3 : A1}"/>`;
    }
    return out + `<path d="M0 ${H} H${W}" stroke="${B}" stroke-width="1" opacity="${HAIR}"/>`;
  },

  /* 3 — thrown rings, the ripple of a sound system */
  (r, W, H) => {
    const cx = W * (0.2 + r() * 0.6), cy = H * (0.3 + r() * 0.4);
    const step = Math.min(W, H) * 0.11;
    let out = "";
    for (let i = 1; i <= 5; i++) {
      out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(step * i).toFixed(1)}"
        fill="none" stroke="${B}" stroke-width="${i === 2 ? 1.6 : 1}" opacity="${i === 2 ? HAIR : A3}"/>`;
    }
    return out;
  },

  /* 4 — a grid with one cell filled: the ticket, the seat, the room */
  (r, W, H) => {
    const cols = 5 + Math.floor(r() * 3), rows = Math.max(3, Math.round(cols * H / W));
    const cw = W / cols, ch = H / rows;
    const fx = Math.floor(r() * cols), fy = Math.floor(r() * rows);
    let out = "";
    for (let i = 1; i < cols; i++)
      out += `<path d="M${(i * cw).toFixed(1)} 0 V${H}" stroke="${B}" stroke-width="1" opacity="${A2}"/>`;
    for (let j = 1; j < rows; j++)
      out += `<path d="M0 ${(j * ch).toFixed(1)} H${W}" stroke="${B}" stroke-width="1" opacity="${A2}"/>`;
    out += `<rect x="${(fx * cw).toFixed(1)}" y="${(fy * ch).toFixed(1)}"
      width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" fill="${B}" opacity="${A3}"/>`;
    return out;
  },

  /* 5 — a waveform, the night as a signal */
  (r, W, H) => {
    const mid = H * (0.45 + r() * 0.15), amp = H * (0.12 + r() * 0.16);
    const n = 40;
    let d = `M0 ${mid.toFixed(1)}`;
    for (let i = 1; i <= n; i++) {
      const x = (W * i) / n;
      const y = mid + Math.sin(i * (0.4 + r() * 0.1)) * amp * (0.35 + r() * 0.65);
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return `
      <path d="${d}" fill="none" stroke="${B}" stroke-width="1.6" opacity="${HAIR}"/>
      <path d="${d} L${W} ${H} L0 ${H} Z" fill="${B}" opacity="${A1}"/>`;
  },
];

/* Grain, defined once in the document rather than per poster. */
export const GRAIN_DEFS = `
<svg width="0" height="0" aria-hidden="true" focusable="false"
  style="position:absolute"><defs>
  <filter id="wte-grain"><feTurbulence type="fractalNoise" baseFrequency=".9"
    numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/>
  </filter></defs></svg>`;

const RATIOS = { "1/1": 1, "25/16": 25 / 16, "3/4": 3 / 4, "4/3": 4 / 3 };

/**
 * poster(ev, { ratio, seed }) — a monochrome SVG drawn for the aspect it will
 * actually be shown at. `ratio` is one of the keys above.
 */
export function poster(ev, { ratio = "1/1", seed = 0 } = {}) {
  const ar = RATIOS[ratio] || 1;
  const W = 400, H = Math.round(W / ar);
  const key = `${ev.id}:${ev.title || ""}:${seed}`;
  const h = hashStr(key);
  const r = rng(h);
  const comp = COMPOSITIONS[h % COMPOSITIONS.length];
  const id = `g${(h >>> 0).toString(36)}${seed}`;

  return `<svg class="art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"
    aria-hidden="true" focusable="false">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2=".2" y2="1">
      <stop offset="0" stop-color="${DEEP}"/><stop offset="1" stop-color="${LIFT}"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#${id})"/>
    ${comp(r, W, H)}
    <rect width="${W}" height="${H}" filter="url(#wte-grain)" opacity=".035"/>
  </svg>`;
}

/** The six choices offered in the publish flow, seeded off one event. */
export const POSTER_SEEDS = [0, 1, 2, 3, 4, 5];
