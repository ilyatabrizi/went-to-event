/* Went — what you are going to, and what you have been to. The tab the product
   is named after, so it holds the record, not just the tickets. */

import { state, save } from "../store.js";
import { byId } from "../data/events.js";
import { esc, money, hashStr, plural } from "../util.js";
import { icon } from "../icons.js";
import { cover, sectionHead, empty, lazyImages, pageTitle } from "../parts.js";
import { segmented, toast } from "../ui.js";
import { go, refresh } from "../router.js";

/* A real, scannable-looking matrix generated from the ticket's own reference —
   deterministic, so the same ticket always shows the same code. Not a working
   QR payload; it is a preview, and the pass says so. */
export function qrSVG(ref, size = 33) {
  const h = hashStr(ref);
  let s = h || 1;
  const rand = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const grid = [];
  for (let y = 0; y < size; y++) { grid[y] = []; for (let x = 0; x < size; x++) grid[y][x] = rand() > 0.5; }

  /* three finder patterns, so it reads as a QR at a glance */
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
    <g fill="#0E0B10">${cells.join("")}</g></svg>`;
}

export const ticketRef = (t) =>
  "WTE-" + String(hashStr(t.eventId + "-" + t.tier + "-" + t.qty) % 900000 + 100000);

/* ------------------------------------------------------------- the list */
export default function went() {
  const upcoming = state.myTickets.filter((t) => !t.past);
  const past = state.myTickets.filter((t) => t.past);
  const list = state.wentTab === "upcoming" ? upcoming : past;

  const html = `
  <div class="wrap">
    ${pageTitle("Went")}
    <div style="margin-top:18px">
      ${segmented("wenttab", [
        { key: "upcoming", label: `Upcoming${upcoming.length ? " · " + upcoming.length : ""}` },
        { key: "past", label: `Past${past.length ? " · " + past.length : ""}` },
      ], state.wentTab)}
    </div>

    <section class="section">
      ${list.length
        ? `<div class="stack">${list.map(passCard).join("")}</div>`
        : empty("ticket",
            state.wentTab === "upcoming" ? "Nothing booked yet" : "Nothing in the past",
            state.wentTab === "upcoming"
              ? "When you RSVP or buy a ticket it lands here, ready to scan at the door."
              : "Events you have been to collect here — that is the “went” part.",
            { href: "#/explore", label: "Find something" })}
    </section>
  </div>`;

  return { html, mount: (el) => lazyImages(el) };
}

function passCard(t) {
  const ev = byId(t.eventId);
  const i = state.myTickets.indexOf(t);
  const tier = ev.tiers[Math.min(t.tier, ev.tiers.length - 1)];
  return `
  <a class="card" href="#/pass/${i}" style="overflow:hidden;display:block">
    <span class="row" style="padding:12px;gap:13px">
      <span class="cover" style="width:64px;height:64px;border-radius:var(--r-sm);flex:none">
        ${cover(ev, { w: 260 })}</span>
      <span class="row-copy">
        <span class="badge" style="align-self:flex-start;margin-bottom:5px;background:var(--wash)">
          ${t.past ? "Attended" : "Confirmed"}</span>
        <span class="row-t clip">${esc(ev.title)}</span>
        <span class="row-s clip">${esc(ev.dateLong)} · ${esc(ev.timeRange)}</span>
      </span>
      <span class="row-go">${icon("qr")}</span>
    </span>
    <span class="spread" style="padding:11px 16px;background:var(--wash)">
      <span class="row-s">${t.qty} × ${esc(tier.name)}</span>
      <span class="row-s money" style="letter-spacing:.08em">${ticketRef(t)}</span>
    </span>
  </a>`;
}

/* --------------------------------------------------------------- the pass */
export function pass({ idx }) {
  const t = state.myTickets[+idx];
  if (!t) {
    return {
      html: `<div class="wrap">${empty("ticket", "Ticket not found",
        "This one is no longer in your wallet.", { href: "#/went", label: "Back to Went" })}</div>`,
      tabs: false, bar: { back: true, title: "Ticket" },
    };
  }
  const ev = byId(t.eventId);
  const tier = ev.tiers[Math.min(t.tier, ev.tiers.length - 1)];
  const ref = ticketRef(t);

  const html = `
  <div class="wrap">
    <div class="pass">
      <div class="pass-head">
        <div class="pass-t">${esc(ev.title)}</div>
        <div class="pass-s">${esc(ev.venue)} · ${esc(ev.address)}</div>
      </div>
      <div class="pass-rip"><span class="pass-dash"></span></div>
      <div class="pass-body">
        ${qrSVG(ref)}
        <div class="pass-ref">${ref}</div>
        <div class="pass-grid">
          <div><div class="pass-k">When</div><div class="pass-v">${esc(ev.dateLong)}</div></div>
          <div><div class="pass-k">Doors</div><div class="pass-v">${esc(ev.timeRange.split(" – ")[0])}</div></div>
          <div><div class="pass-k">Ticket</div><div class="pass-v">${esc(tier.name)}</div></div>
          <div><div class="pass-k">Admits</div><div class="pass-v">${t.qty}</div></div>
        </div>
      </div>
    </div>

    <p class="tiny" style="text-align:center;padding-top:18px">
      The code is generated for the preview and will not scan at a real door.</p>
  </div>`;

  return {
    html, tabs: false,
    bar: { back: true, title: "Your ticket" },
    dock: `<div class="dock-row">
      <button class="btn btn-soft" type="button" id="share" style="flex:1">${icon("share", 17)} Share</button>
      <a class="btn btn-primary" href="#/event/${ev.id}" style="flex:1">Event</a>
    </div>`,
    mount(el) {
      el.querySelector("#share")?.addEventListener("click", async () => {
        const data = { title: ev.title, text: `I am going to ${ev.title}.`, url: location.href };
        try {
          if (navigator.share) await navigator.share(data);
          else { await navigator.clipboard.writeText(location.href); toast("Link copied", "check"); }
        } catch {}
      });
    },
  };
}
