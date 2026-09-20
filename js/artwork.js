/* ============================================================================
   POSTER ART

   Every cover in this app is drawn, not photographed. Stock photography was the
   wrong answer twice over: the same six crowd shots repeated across a feed, and
   none of them belonged to this brand. What a club night actually gets from a
   studio is a poster — a field of colour, one strong geometric idea, and grain.
   So that is what we generate, seeded on the event, which means a given event
   looks the same on every device and forever, with nothing to download.

   Rules it keeps:
   · Ink is still the ground. Every field is a dark duotone, so Bone type sits on
     it at AAA without a scrim fighting a photograph.
   · One hue per poster. No poster carries two brand colours.
   · Ember is not decoration here — it appears in artwork only as the accent of
     last resort, on roughly one poster in six, which keeps the 1% rule honest.
   ========================================================================== */

import { hashStr, rng } from "./util.js";

/* One hue per category, and it is a LIGHT SOURCE, not a fill. The card stays
   close to Ink; the hue arrives as a glow in one corner and on one edge. That
   is what keeps a feed of twenty of these feeling like one dark room rather
   than a page of gradient wallpaper — and it is what keeps Ink at 70%. */
const FIELDS = {
  Nightlife: ["#0D0912", "#2E1640", "#A855F7"],
  Music:     ["#090B16", "#152049", "#5B7CFF"],
  Food:      ["#120A06", "#3A1B0D", "#F97316"],
  Fitness:   ["#120708", "#3D1412", "#FB5A45"],
  Wellness:  ["#05100B", "#0D2E20", "#34D399"],
  Art:       ["#060D12", "#0D2938", "#38BDF8"],
  Sports:    ["#080F06", "#193312", "#84CC16"],
  Talks:     ["#070A11", "#141F35", "#60A5FA"],
  Comedy:    ["#110B04", "#38260A", "#FBBF24"],
  Markets:   ["#0C0812", "#291A38", "#A78BFA"],
  Film:      ["#08060F", "#1A1430", "#818CF8"],
  Theatre:   ["#10050E", "#37102C", "#F472B6"],
  Workshops: ["#0F0A04", "#33250A", "#E3A008"],
  Outdoors:  ["#050E09", "#0F2C1D", "#4ADE80"],
  Community: ["#0B0810", "#251A33", "#9B7BE8"],
};
const DEFAULT_FIELD = FIELDS.Nightlife;

/* Six compositions. Each is one idea drawn large enough to survive a crop —
   these get sliced to everything from a 5:3.4 card to a tall hero, so nothing
   important may sit in the middle third alone. */
const COMPOSITIONS = [
  /* 0 — a shaft of light across the frame, the beam over a dance floor */
  (r, [, lift, acc]) => {
    const x = 40 + r() * 200, w = 60 + r() * 90, skew = 40 + r() * 90;
    return `
      <path d="M${x} -20 L${x + w} -20 L${x + w + skew} 288 L${x + skew - 30} 288 Z"
        fill="${acc}" opacity=".16"/>
      <path d="M${x + w * .3} -20 L${x + w * .55} -20 L${x + w * .55 + skew} 288 L${x + w * .3 + skew} 288 Z"
        fill="${acc}" opacity=".2"/>
      <path d="M0 ${(150 + r() * 70).toFixed(0)} H400" stroke="${lift}" stroke-width="1" opacity=".5"/>`;
  },

  /* 1 — a horizon with a disc breaking it */
  (r, [, lift, acc]) => {
    const y = 130 + r() * 76, cx = 60 + r() * 280, rad = 40 + r() * 34;
    return `
      <circle cx="${cx.toFixed(0)}" cy="${y.toFixed(0)}" r="${rad.toFixed(0)}" fill="${acc}" opacity=".30"/>
      <circle cx="${cx.toFixed(0)}" cy="${y.toFixed(0)}" r="${rad.toFixed(0)}" fill="none"
        stroke="${acc}" stroke-width="1.4" opacity=".7"/>
      <path d="M0 ${y.toFixed(0)} H400 V268 H0 Z" fill="${lift}" opacity=".5"/>
      <path d="M0 ${y.toFixed(0)} H400" stroke="${acc}" stroke-width="1.2" opacity=".8"/>`;
  },

  /* 2 — a skyline of bars, one of them lit */
  (r, [, lift, acc]) => {
    let s = "", x = -14;
    const hot = 2 + Math.floor(r() * 7);
    for (let i = 0; i < 14 && x < 410; i++) {
      const w = 20 + r() * 34, h = 80 + r() * 175;
      s += `<rect x="${x.toFixed(0)}" y="${(268 - h).toFixed(0)}" width="${w.toFixed(0)}"
        height="${h.toFixed(0)}" fill="${i === hot ? acc : lift}"
        opacity="${i === hot ? ".5" : (0.34 + r() * 0.3).toFixed(2)}"/>`;
      x += w + 4 + r() * 12;
    }
    return s;
  },

  /* 3 — concentric rings thrown from one corner, a speaker facing the room */
  (r, [, lift, acc]) => {
    const cx = r() < .5 ? -20 : 420, cy = r() < .5 ? -10 : 278;
    let s = "";
    for (let i = 9; i >= 1; i--) {
      const rad = i * 42;
      s += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none"
        stroke="${i === 4 ? acc : lift}" stroke-width="${i === 4 ? 2.2 : 1.2}"
        opacity="${i === 4 ? ".75" : (0.24 + i * 0.045).toFixed(2)}"/>`;
    }
    return s;
  },

  /* 4 — a ticket grid: heavy rules, three cells alight */
  (r, [, lift, acc]) => {
    const cols = 6, rows = 4, cw = 400 / cols, ch = 268 / rows;
    let s = "";
    const lit = new Set();
    while (lit.size < 3) lit.add(Math.floor(r() * cols * rows));
    [...lit].forEach((n, i) => {
      const x = (n % cols) * cw, y = Math.floor(n / cols) * ch;
      s += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${cw.toFixed(0)}"
        height="${ch.toFixed(0)}" fill="${acc}" opacity="${[".46", ".26", ".14"][i]}"/>`;
    });
    for (let i = 1; i < cols; i++)
      s += `<path d="M${(i * cw).toFixed(0)} 0 V268" stroke="${acc}" stroke-width="1" opacity=".2"/>`;
    for (let j = 1; j < rows; j++)
      s += `<path d="M0 ${(j * ch).toFixed(0)} H400" stroke="${acc}" stroke-width="1" opacity=".2"/>`;
    return s;
  },

  /* 5 — a waveform, drawn three times at a decaying offset */
  (r, [, lift, acc]) => {
    const amp = 22 + r() * 30, y = 110 + r() * 70, k = 0.6 + r() * 0.8;
    const path = (off) => {
      let d = `M-10 ${(y + off).toFixed(0)}`;
      for (let x = -10; x <= 410; x += 14)
        d += ` L${x} ${(y + off + Math.sin(x / 44 * k + off * .06) * amp).toFixed(1)}`;
      return d;
    };
    return `
      <path d="${path(0)}" fill="none" stroke="${acc}" stroke-width="2.2" opacity=".85"/>
      <path d="${path(26)}" fill="none" stroke="${lift}" stroke-width="1.6" opacity=".8"/>
      <path d="${path(54)}" fill="none" stroke="${lift}" stroke-width="1.2" opacity=".55"/>
      <path d="${path(-26)}" fill="none" stroke="${lift}" stroke-width="1.2" opacity=".45"/>`;
  },
];

/* Grain. A poster without texture reads as a CSS gradient; with it, as print.
   One shared filter for the whole document — 400 inline copies of a turbulence
   filter is a real cost, one is free. */
export const GRAIN_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="wte-grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".82" numOctaves="3" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
</svg>`;

/**
 * The poster for an event. Deterministic: same event, same art, always.
 * `seed` lets a caller ask for a different draw of the same event — which is
 * how the publish flow offers a choice of covers.
 */
export function poster(ev, { seed = 0, tall = false } = {}) {
  const key = `${ev.id}:${ev.title || ""}:${seed}`;
  const h = hashStr(key);
  const r = rng(h);
  const field = FIELDS[ev.cat] || DEFAULT_FIELD;
  const [deep, lift, acc] = field;
  const comp = COMPOSITIONS[h % COMPOSITIONS.length];
  const id = `p${(h >>> 0).toString(36)}${seed}`;
  const gx = (0.12 + r() * 0.76).toFixed(2);
  const gy = (0.04 + r() * 0.44).toFixed(2);

  /* A hero is roughly 400×560, and slicing a 400×268 poster into it throws away
     most of the composition — which is why the detail screen read as an empty
     wash. Tall mode gives the same drawing a taller canvas and sits it low,
     where the title is not. */
  const H = tall ? 560 : 268;
  const shift = tall ? 168 : 0;

  return `
<svg class="cover-art" viewBox="0 0 400 ${H}" preserveAspectRatio="xMidYMid slice"
     aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="${id}l" cx="${gx}" cy="${gy}" r=".9">
      <stop offset="0" stop-color="${acc}" stop-opacity=".36"/>
      <stop offset=".45" stop-color="${acc}" stop-opacity=".12"/>
      <stop offset="1" stop-color="${acc}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0B0A0C" stop-opacity="0"/>
      <stop offset=".52" stop-color="#0B0A0C" stop-opacity=".2"/>
      <stop offset="1" stop-color="#0B0A0C" stop-opacity=".9"/>
    </linearGradient>
  </defs>
  <rect width="400" height="${H}" fill="${deep}"/>
  <rect width="400" height="${H}" fill="url(#${id}l)"/>
  <g transform="translate(0 ${shift})">${comp(r, field)}</g>
  <rect width="400" height="${H}" fill="url(#${id}v)"/>
  <rect width="400" height="${H}" filter="url(#wte-grain)" opacity=".3"
        style="mix-blend-mode:soft-light"/>
</svg>`;
}

/* A square crop of the same idea, for avatars of hosts and for the app's own
   generated imagery in lists. */
export function tile(key, size = 96) {
  const h = hashStr(String(key));
  const r = rng(h);
  const names = Object.keys(FIELDS);
  const [deep, lift, acc] = FIELDS[names[h % names.length]];
  const id = `t${(h >>> 0).toString(36)}`;
  return `
<svg viewBox="0 0 96 96" width="${size}" height="${size}" aria-hidden="true">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2=".4" y2="1">
    <stop offset="0" stop-color="${lift}"/><stop offset="1" stop-color="${deep}"/>
  </linearGradient></defs>
  <rect width="96" height="96" fill="url(#${id})"/>
  <circle cx="${(20 + r() * 56).toFixed(0)}" cy="${(20 + r() * 56).toFixed(0)}"
    r="${(16 + r() * 20).toFixed(0)}" fill="${acc}" opacity=".38"/>
</svg>`;
}

export const FIELD_KEYS = Object.keys(FIELDS);
export { FIELDS };
