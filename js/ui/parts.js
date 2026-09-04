/* The pieces every screen is built from. Pure functions returning HTML — the
   views stay declarative and the router can re-render any of them cheaply. */

import { esc, compact, plural, money } from '../util.js';
import { ico, icoFill, badge } from '../icons.js';
import { USERS } from '../data/people.js';
import { COV, IMG, photoUrl, catIcon, catLabel } from '../data/geo.js';
import { state, isSaved } from '../store.js';
import { byId } from '../data/events.js';

/* ---- avatar ---- */
export function avatar(key, size = 38, cls = '') {
  const u = USERS[key];
  if (!u) return `<div class="av ${cls}" style="width:${size}px;height:${size}px"></div>`;
  const fs = Math.max(10, Math.round(size * 0.36));
  return `<div class="av ${cls}" style="width:${size}px;height:${size}px;background:${u.bg};font-size:${fs}px">
    <span>${esc(u.initials)}</span>
    <img data-lazy alt="" src="${u.photo}">
  </div>`;
}
export const verified = (key, size = 14) => {
  const u = USERS[key];
  const member = key === 'ava' ? state.member : !!(u && u.member);
  return member ? `<span class="verif" title="Member" aria-label="Member">${badge(size)}</span>` : '';
};
export const nameLine = (key, cls = 't-head') =>
  `<span class="${cls}" style="display:inline-flex;align-items:center;gap:4px">${esc(USERS[key] ? USERS[key].name : key)}${verified(key)}</span>`;

/* ---- cover art ----
   A brand-family gradient with a woven motif always renders first; the photo
   fades in over it. A blocked or slow image degrades to brand, not to a hole. */
export function cover(ev) {
  const c = COV[ev.cat] || COV.Nightlife;
  const gid = 'g' + ev.id;
  const arr = IMG[ev.cat];
  const src = (!ev.userMade && arr && arr.length) ? photoUrl(arr[ev.id % arr.length]) : null;
  return `<svg class="covsvg" viewBox="0 0 400 268" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2=".35" y2="1">
        <stop offset="0" stop-color="${c.g[0]}"/><stop offset="1" stop-color="${c.g[1]}"/>
      </linearGradient></defs>
      <rect width="400" height="268" fill="url(#${gid})"/>
      <g opacity=".22" fill="none" stroke="#F4F1EC" stroke-width="1">
        <circle cx="${60 + (ev.id % 7) * 40}" cy="${40 + (ev.id % 5) * 30}" r="86"/>
        <circle cx="${320 - (ev.id % 5) * 30}" cy="${210 - (ev.id % 4) * 26}" r="62"/>
      </g>
    </svg>` + (src ? `<img data-lazy alt="" src="${src}">` : '');
}

export const saveBtn = id => `<button class="savebtn press" data-act="save" data-id="${id}"
  aria-pressed="${isSaved(id) ? 'true' : 'false'}" aria-label="Save event">${icoFill('bookmark', 18)}</button>`;

/* ---- friends going ---- */
export function facePile(keys, size = 24) {
  if (!keys || !keys.length) return '';
  return `<div class="pile">${keys.slice(0, 4).map(k => avatar(k, size)).join('')}</div>`;
}
export function friendsLine(ev) {
  const f = (ev.friends || []).filter(k => !state.blocked[k]);
  if (!f.length) return `<span class="t-sub">${compact(ev.going)} going</span>`;
  const names = f.slice(0, 2).map(k => (USERS[k] || {}).name.split(' ')[0]).join(' & ');
  const rest = f.length - 2;
  return `<span class="t-sub">${esc(names)}${rest > 0 ? ` +${rest}` : ''} going</span>`;
}

/* ---- the event card — the single most repeated object in the product ---- */
export function eventCard(ev, { wide = false } = {}) {
  const locked = ev.member && !state.member;
  return `<article class="card press-sm" data-act="event" data-id="${ev.id}" role="button" tabindex="0"
    aria-label="${esc(ev.title)}, ${esc(ev.when)}">
    <div class="cover">
      ${cover(ev)}
      <div class="cover-scrim"></div>
      <div class="cover-top">
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${ev.soon ? `<span class="chip chip-ember">${ico('bolt', 13)}Tonight</span>` : ''}
          ${locked ? `<span class="chip chip-gold">${ico('diamond', 13)}Members</span>`
                   : `<span class="chip">${ico(catIcon(ev.cat), 13)}${esc(catLabel(ev.cat))}</span>`}
        </div>
        ${saveBtn(ev.id)}
      </div>
      <div class="cover-bot">
        <div class="t-title" style="text-wrap:balance">${esc(ev.title)}</div>
      </div>
    </div>
    <div style="padding:12px 14px 13px">
      <div class="row" style="gap:8px;margin-bottom:9px">
        <span class="t-sub" style="color:var(--bone);font-weight:600">${esc(ev.when)}</span>
        <span class="t-sub">·</span>
        <span class="t-sub" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.venue)}</span>
      </div>
      <div class="row" style="justify-content:space-between">
        <div class="row" style="gap:8px">
          ${facePile(ev.friends)}
          ${friendsLine(ev)}
        </div>
        <span class="t-head ${ev.minPrice === 0 ? '' : ''}" style="font-size:15px">${ev.priceLabel}</span>
      </div>
    </div>
  </article>`;
}

/* Compact row — used in rails, saved lists, search results */
export function eventRow(ev, { sub } = {}) {
  return `<button class="row press-sm" data-act="event" data-id="${ev.id}"
    style="width:100%;gap:12px;padding:8px;border-radius:var(--r-md);text-align:left">
    <div style="width:74px;height:74px;border-radius:var(--r-sm);overflow:hidden;position:relative;flex:none">
      ${cover(ev)}<div class="cover-scrim" style="opacity:.5"></div>
    </div>
    <div style="flex:1;min-width:0">
      <div class="t-head" style="font-size:15.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.title)}</div>
      <div class="t-sub" style="margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(sub || (ev.when + ' · ' + ev.venue))}</div>
      <div class="row" style="gap:7px;margin-top:6px">
        <span class="chip chip-solid" style="height:22px;font-size:10.5px;padding:0 8px">${esc(ev.priceLabel)}</span>
        <span class="t-sub" style="font-size:12px">${compact(ev.going)} going</span>
      </div>
    </div>
    <span style="color:var(--ash);flex:none">${ico('fwd', 18)}</span>
  </button>`;
}

/* Tall rail card — "tonight near you" */
export function railCard(ev) {
  return `<article class="card press-sm" data-act="event" data-id="${ev.id}" role="button" tabindex="0"
    style="width:212px" aria-label="${esc(ev.title)}">
    <div class="cover" style="aspect-ratio:1/1.12">
      ${cover(ev)}<div class="cover-scrim"></div>
      <div class="cover-top">
        <span class="chip">${ico('clock', 13)}${esc(ev.when.split('·').pop().trim())}</span>
      </div>
      <div class="cover-bot">
        <div class="t-head" style="font-size:16px;margin-bottom:5px;text-wrap:balance">${esc(ev.title)}</div>
        <div class="row" style="justify-content:space-between">
          <span class="t-sub" style="font-size:12px">${compact(ev.going)} going</span>
          <span class="t-sub" style="font-size:12px;color:var(--bone);font-weight:640">${esc(ev.priceLabel)}</span>
        </div>
      </div>
    </div>
  </article>`;
}

/* ---- section header ---- */
export const sectionHead = (title, action) => `
  <div class="row" style="justify-content:space-between;margin:0 0 12px">
    <h2 class="t-cap ash" style="margin:0">${esc(title)}</h2>
    ${action ? `<button class="t-sub press" data-act="${action.act}" ${action.data || ''}
       style="color:var(--bone);font-weight:620;font-size:13px">${esc(action.label)}</button>` : ''}
  </div>`;

export const empty = (icon, title, sub, cta) => `
  <div class="empty">
    <div class="empty-ic">${ico(icon, 25)}</div>
    <div class="t-head" style="margin-bottom:6px">${esc(title)}</div>
    <p class="t-sub" style="margin:0 auto;max-width:270px">${esc(sub)}</p>
    ${cta ? `<button class="btn btn-ghost press" data-act="${cta.act}" ${cta.data || ''}
       style="width:auto;height:42px;padding:0 22px;margin:18px auto 0;font-size:14px">${esc(cta.label)}</button>` : ''}
  </div>`;

/* ---- segmented control ---- */
export const segmented = (id, items, activeKey) => `
  <div class="seg" data-seg="${id}" role="tablist">
    <div class="seg-pill" aria-hidden="true"></div>
    ${items.map(i => `<button role="tab" data-segkey="${i.key}"
      aria-selected="${i.key === activeKey ? 'true' : 'false'}">${esc(i.label)}</button>`).join('')}
  </div>`;

/* ---- post card ---- */
export function postCard(p) {
  const u = USERS[p.author] || { name: p.author, initials: '?' };
  const photo = p.photo && p.photo.startsWith('cov:')
    ? (() => { const cat = p.photo.slice(4); const arr = IMG[cat]; 
        return arr ? photoUrl(arr[Math.abs(p.id.length * 3) % arr.length], 700) : null; })()
    : p.photo;
  return `<article class="card" style="padding:14px">
    <div class="row" style="gap:10px">
      <button class="press" data-act="user" data-key="${p.author}" aria-label="${esc(u.name)}">${avatar(p.author, 38)}</button>
      <div style="flex:1;min-width:0">
        <div class="row" style="gap:5px">
          <button class="press" data-act="user" data-key="${p.author}">${nameLine(p.author, 't-head')}</button>
          <span class="t-sub" style="font-size:12.5px">· ${esc(p.ago)}</span>
        </div>
        <div class="t-sub" style="font-size:12.5px;margin-top:-1px">@${esc(u.handle || p.author)}</div>
      </div>
      <button class="gbtn press" data-act="more" data-mtype="post" data-key="${p.author}" data-id="${p.id}"
        style="width:30px;height:30px;background:none;border:0;box-shadow:none;color:var(--ash)"
        aria-label="More">${ico('more', 18)}</button>
    </div>
    ${p.text ? `<p class="t-body" style="margin:11px 0 0">${esc(p.text)}</p>` : ''}
    ${photo ? `<div style="margin-top:12px;border-radius:var(--r-md);overflow:hidden;aspect-ratio:16/10;background:var(--ink-1)">
        <img data-lazy alt="" src="${photo}" style="width:100%;height:100%;object-fit:cover;opacity:0"></div>` : ''}
    ${p.eventId ? (() => { const ev = byId(p.eventId); return ev ? `
      <button class="row press-sm" data-act="event" data-id="${ev.id}"
        style="width:100%;margin-top:12px;padding:8px;gap:10px;border-radius:var(--r-sm);
               background:rgba(244,241,236,.05);border:1px solid var(--hair);text-align:left">
        <div style="width:42px;height:42px;border-radius:10px;overflow:hidden;position:relative;flex:none">${cover(ev)}</div>
        <div style="flex:1;min-width:0">
          <div class="t-sub" style="font-size:10.5px;letter-spacing:.06em;text-transform:uppercase">Went to</div>
          <div class="t-head" style="font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.title)}</div>
        </div>
        <span style="color:var(--ash)">${ico('fwd', 16)}</span>
      </button>` : ''; })() : ''}
    <div class="row" style="gap:18px;margin-top:12px">
      <button class="row press t-sub" data-act="like" data-id="${p.id}" style="gap:6px;font-size:12.5px">
        ${ico('heart', 17)} ${compact(p.likes)}</button>
      <button class="row press t-sub" data-act="toast" data-msg="Replies are next up in the build"
        style="gap:6px;font-size:12.5px">${ico('chat', 17)} ${p.replies}</button>
      <button class="row press t-sub" data-act="share" style="gap:6px;font-size:12.5px;margin-left:auto">
        ${ico('share', 16)}</button>
    </div>
  </article>`;
}

export { money, compact, plural };
