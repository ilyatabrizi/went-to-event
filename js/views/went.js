/* WENT — what you are going to, and what you have been to.
 *
 * `past` is DERIVED from the ticket's own dayOffset, written at RSVP time from
 * the event's. The old build stored a `past:false` flag that nothing ever set
 * to true, so both halves of its segmented control were structurally
 * unfillable — which is why that control is gone: the section head and the
 * greyed titles do the job, and they cannot disagree with the data. */

import { state } from "../store.js";
import { byId } from "../data/events.js";
import { esc, money, hashStr } from "../util.js";
import { entry, head, empty, tagLive, tag, brandMark } from "../parts.js";

export const isPast = (t) => t.dayOffset < 0;
export const ticketRef = (t) =>
  "WTE-" + String(hashStr(`${t.eventId}-${t.tier}-${t.qty}`) % 900000 + 100000);

/* ------------------------------------------------------------- the list */
export default function went() {
  const mine = state.myTickets.map((t, i) => ({ t, i, ev: byId(t.eventId) })).filter((x) => x.ev);
  const upcoming = mine.filter((x) => !isPast(x.t));
  const past = mine.filter((x) => isPast(x.t));

  const html = `
  <div class="wrap s5">
    ${upcoming.length
      ? upcoming.map(({ t, i, ev }) => entry(ev, {
          href: `#/pass/${i}`,
          tag: ev.dayOffset === 0 ? "Tonight" : "",
        })).join("")
      : empty("ticket", "Nothing booked yet",
          "When you RSVP or buy a ticket it lands here, ready to scan at the door.",
          { href: "#/", label: "Find something" })}

    ${past.length ? `
      <div class="s7">${head("Earlier", { open: true })}</div>
      ${past.map(({ i, ev }) => entry(ev, { href: `#/pass/${i}`, past: true })).join("")}` : ""}
    <div class="s8"></div>
  </div>`;

  return { html, bar: { kind: "title", title: "Went" } };
}

/* --------------------------------------------------------------- the pass */
/* A real, scannable-looking matrix generated from the ticket's own reference —
   deterministic, so the same ticket always shows the same code. */
export function qrSVG(ref, size = 33) {
  let s = hashStr(ref) || 1;
  const rand = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const grid = [];
  for (let y = 0; y < size; y++) { grid[y] = []; for (let x = 0; x < size; x++) grid[y][x] = rand() > 0.5; }
  const finder = (ox, oy) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const edge = x === 0 || x === 6 || y === 0 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      grid[oy + y][ox + x] = edge || core;
    }
    for (let y = -1; y < 8; y++) for (let x = -1; x < 8; x++) {
      const gy = oy + y, gx = ox + x;
      if (gy < 0 || gx < 0 || gy >= size || gx >= size) continue;
      if (y === -1 || y === 7 || x === -1 || x === 7) grid[gy][gx] = false;
    }
  };
  finder(0, 0); finder(size - 7, 0); finder(0, size - 7);
  const cells = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
    if (grid[y][x]) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img"
    aria-label="Ticket QR code"><rect width="${size}" height="${size}" fill="#F7F2E9"/>
    <g fill="#141216">${cells.join("")}</g></svg>`;
}

export function pass({ idx }) {
  const t = state.myTickets[+idx];
  if (!t) {
    return {
      html: `<div class="wrap s5">${empty("ticket", "Ticket not found",
        "This one is no longer in your wallet.", { href: "#/went", label: "Back to Went" })}</div>`,
      tabs: false, bar: { kind: "back", title: "Ticket" },
    };
  }
  const ev = byId(t.eventId);
  const tier = ev.tiers[Math.min(t.tier, ev.tiers.length - 1)];
  const ref = ticketRef(t);

  const html = `
  <div class="wrap s5">
    <div class="pass">
      <div class="t-2">${esc(ev.title)}</div>
      <div class="t-5 pass-s s1">${esc(ev.dateLong)} · ${esc(ev.venue)}</div>
      <div class="pass-rip"><i></i><i></i></div>
      ${qrSVG(ref)}
      <div class="t-7 pass-ref">${ref}</div>
      <div class="pass-grid">
        <div><span class="t-7 pass-k">When</span><span class="t-4 w-600">${esc(ev.dateLong)}</span></div>
        <div><span class="t-7 pass-k">Doors</span><span class="t-4 w-600">${esc(ev.timeRange.split(" – ")[0])}</span></div>
        <div><span class="t-7 pass-k">Ticket</span><span class="t-4 w-600">${esc(tier.name)}</span></div>
        <div><span class="t-7 pass-k">Admits</span><span class="t-4 w-600">${t.qty}</span></div>
      </div>
      <div class="pass-mark">${brandMark(22)}</div>
    </div>
    <p class="t-6 c-ash s3">The code is generated for this preview and will not scan at a real door.</p>
    <div class="s8"></div>
  </div>`;

  return { html, tabs: false, bar: { kind: "back", title: "Ticket" } };
}
