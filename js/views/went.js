import { state } from '../store.js';
import { byId } from '../data/events.js';
import { esc, money, hashStr } from '../util.js';
import { ico } from '../icons.js';
import { cover, segmented, empty, sectionHead } from '../ui/parts.js';

/* A real, scannable-looking matrix generated from the ticket's own reference —
   deterministic, so the same ticket always shows the same code. Not a working
   QR payload; it is a preview, and it says so on the pass. */
export function qrSVG(ref, size = 33) {
  const h = hashStr(ref);
  let s = h || 1;
  const rand = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const cells = [];
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

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
    if (grid[y][x]) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);

  return `<svg class="qr" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img"
    aria-label="Ticket QR code"><rect width="${size}" height="${size}" fill="#F7F2E9"/>
    <g fill="#0E0B10">${cells.join('')}</g></svg>`;
}

export const ticketRef = t => 'WTE-' + String(hashStr(t.eventId + '-' + t.tier + '-' + t.qty) % 900000 + 100000);

export function wentView() {
  const upcoming = state.myTickets.filter(t => !t.past);
  const past = state.myTickets.filter(t => t.past);
  const list = state.wentTab === 'upcoming' ? upcoming : past;

  return `
  <div class="pad" style="padding-top:calc(max(var(--top),12px) + 6px)">
    <h1 class="t-display" style="margin:0 0 16px">Went</h1>
    ${segmented('wenttab', [
      { key:'upcoming', label:`Upcoming${upcoming.length ? ' · ' + upcoming.length : ''}` },
      { key:'past',     label:'Past' },
    ], state.wentTab)}

    <div style="margin-top:20px">
      ${list.length ? `<div class="stack" style="--gap:12px">${list.map(ticketCard).join('')}</div>`
        : empty('ticket',
            state.wentTab === 'upcoming' ? 'No tickets yet' : 'Nothing in the past',
            state.wentTab === 'upcoming'
              ? 'When you RSVP or buy a ticket it lands here, ready to scan at the door.'
              : 'Events you have been to will collect here — that is the “went” part.',
            { act:'tab" data-tab="explore', label:'Find something' })}
    </div>
  </div>`;
}

function ticketCard(t, i) {
  const ev = byId(t.eventId);
  const tier = ev.tiers[Math.min(t.tier, ev.tiers.length - 1)];
  return `<button class="card press-sm" data-act="ticket" data-idx="${state.myTickets.indexOf(t)}"
    style="width:100%;display:block;text-align:left;padding:0">
    <div class="row" style="padding:13px;gap:12px">
      <div style="width:64px;height:64px;border-radius:var(--r-sm);overflow:hidden;position:relative;flex:none">
        ${cover(ev)}<div class="cover-scrim" style="opacity:.45"></div>
      </div>
      <div style="flex:1;min-width:0">
        <div class="row" style="gap:6px;margin-bottom:3px">
          <span class="chip chip-solid" style="height:20px;font-size:10px;padding:0 7px">
            ${t.past ? 'Attended' : 'Confirmed'}</span>
        </div>
        <div class="t-head" style="font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.title)}</div>
        <div class="t-sub" style="font-size:12.5px">${esc(ev.dateLong)} · ${esc(ev.timeRange)}</div>
      </div>
      <span style="color:var(--ash);flex:none">${ico('qr', 20)}</span>
    </div>
    <div class="row" style="padding:10px 13px;gap:8px;background:rgba(244,241,236,.035);
         box-shadow:inset 0 1px 0 var(--hair)">
      <span class="t-sub" style="font-size:12px;flex:1">${t.qty} × ${esc(tier.name)}</span>
      <span class="t-sub" style="font-size:12px;font-variant-numeric:tabular-nums">${ticketRef(t)}</span>
    </div>
  </button>`;
}

/* the pass itself */
export function ticketView({ idx }) {
  const t = state.myTickets[idx];
  if (!t) return empty('ticket', 'Ticket not found', 'This ticket is no longer in your wallet.');
  const ev = byId(t.eventId);
  const tier = ev.tiers[Math.min(t.tier, ev.tiers.length - 1)];
  const ref = ticketRef(t);

  return `
  <div class="pad" style="padding-top:calc(max(var(--top),12px) + 58px)">
    <div class="pass" style="box-shadow:0 30px 70px -24px rgba(0,0,0,.9)">
      <div style="padding:20px 20px 16px;text-align:center">
        <div class="t-cap" style="color:rgba(14,11,16,.66);margin-bottom:10px">Went To Event</div>
        <div class="t-title" style="color:#0E0B10;margin-bottom:5px;text-wrap:balance">${esc(ev.title)}</div>
        <div style="color:rgba(14,11,16,.74);font-size:13.5px">${esc(ev.dateLong)} · ${esc(ev.timeRange)}</div>
      </div>

      <div class="pass-notch" style="position:relative;margin:0"><i style="margin-left:-11px"></i><i style="margin-right:-11px"></i></div>

      <div style="padding:20px">
        <div style="max-width:224px;margin:0 auto 14px;padding:11px;background:#F7F2E9;border-radius:14px;
             box-shadow:0 2px 10px rgba(14,11,16,.12)">${qrSVG(ref)}</div>
        <div style="text-align:center;font-size:13px;font-weight:680;letter-spacing:.1em;color:#0E0B10;
             font-variant-numeric:tabular-nums">${ref}</div>
        <div style="text-align:center;font-size:11px;color:rgba(14,11,16,.66);margin-top:5px">
          Show this at the door · preview code</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px;
             padding-top:16px;border-top:1px solid rgba(14,11,16,.12)">
          ${[['Ticket', tier.name], ['Quantity', String(t.qty)],
             ['Venue', ev.venue], ['Paid', money(tier.price * t.qty)]].map(([k, v]) => `
            <div>
              <div style="font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:rgba(14,11,16,.66);
                   font-weight:640;margin-bottom:3px">${esc(k)}</div>
              <div style="font-size:14px;font-weight:620;color:#0E0B10;overflow:hidden;
                   text-overflow:ellipsis;white-space:nowrap">${esc(v)}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="row" style="margin-top:16px;gap:9px;justify-content:center;color:var(--ash)">
      ${ico('eye', 14)}<span class="t-sub" style="font-size:11.5px">Turn your brightness up before you scan</span>
    </div>

    <div class="stack" style="--gap:9px;margin-top:22px">
      <button class="row press-sm" data-act="event" data-id="${ev.id}"
        style="width:100%;padding:13px 14px;gap:11px;border-radius:var(--r-md);
               background:rgba(244,241,236,.045);border:1px solid var(--hair);text-align:left">
        ${ico('pin', 18)}<span class="t-head" style="font-size:14px;flex:1">Event details</span>
        <span style="color:var(--ash)">${ico('fwd', 16)}</span>
      </button>
      <button class="row press-sm" data-act="toast" data-msg="Added to Apple Wallet"
        style="width:100%;padding:13px 14px;gap:11px;border-radius:var(--r-md);
               background:rgba(244,241,236,.045);border:1px solid var(--hair);text-align:left">
        ${ico('wallet', 18)}<span class="t-head" style="font-size:14px;flex:1">Add to Apple Wallet</span>
        <span style="color:var(--ash)">${ico('fwd', 16)}</span>
      </button>
      <button class="row press-sm" data-act="share"
        style="width:100%;padding:13px 14px;gap:11px;border-radius:var(--r-md);
               background:rgba(244,241,236,.045);border:1px solid var(--hair);text-align:left">
        ${ico('share', 18)}<span class="t-head" style="font-size:14px;flex:1">Share with a friend</span>
        <span style="color:var(--ash)">${ico('fwd', 16)}</span>
      </button>
    </div>
  </div>`;
}
