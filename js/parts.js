/* The pieces every view is assembled from. If a shape appears on two screens it
   belongs here, so it can only ever look one way. */

import { esc, money, compact, plural, initials, hashStr } from "./util.js";
import { icon, iconFill } from "./icons.js";
import { catIcon, catLabel } from "./data/geo.js";
import { poster, tile } from "./artwork.js";
import { USERS } from "./data/people.js";
import { state, isSaved, isMember } from "./store.js";

/* ------------------------------------------------------------------ cover */
/* Every cover is drawn here, not fetched. See artwork.js for why. It is inline
   SVG, so it is on screen in the same frame as the text — nothing to load, no
   layout shift, and it works with the radio off. */
export function cover(ev, opts = {}) {
  const art = poster(ev, { seed: opts.seed ?? ev.art ?? 0, tall: !!opts.tall });
  /* A host who brought their own photo gets their own photo. The generated
     poster stays underneath it, so a broken or slow image still has ground. */
  return ev.photo ? `${art}<img class="cover-photo" alt="" src="${esc(ev.photo)}">` : art;
}

/** Wire every cover image on the page. Call after any innerHTML that has one. */
export function lazyImages(root = document) {
  root.querySelectorAll("img[data-lazy]").forEach((img) => {
    img.removeAttribute("data-lazy");
    img.loading = "lazy"; img.decoding = "async";
    const show = () => img.classList.add("on");
    if (img.complete && img.naturalWidth) return show();
    img.addEventListener("load", show, { once: true });
    img.addEventListener("error", () => {
      /* One retry, then give up quietly. Removing the element throws the photo
         away permanently over a hiccup; leaving it hidden shows the gradient
         underneath, which is the designed fallback. */
      if (img.dataset.retried) return;
      img.dataset.retried = "1";
      const src = img.src;
      setTimeout(() => { img.src = src.includes("?") ? src + "&r=1" : src + "?r=1"; }, 900);
    }, { once: true });
  });
}

/* ---------------------------------------------------------------- avatars */
export function avatar(key, size = 40) {
  const u = USERS[key] || { name: key, initials: initials(key) };
  const s = size === 40 ? "" : `width:${size}px;height:${size}px;font-size:${Math.round(size * .36)}px`;
  return `<span class="av" style="${avField(key)};${s}">
    <span>${esc(u.initials || initials(u.name))}</span></span>`;
}

/* An identity mark, not a photograph. Two stops off one hue, picked by name, so
   a person looks the same everywhere and nobody is represented by a stranger
   from a stock library. */
export function avField(key) {
  const h = hashStr(String(key));
  const hue = h % 360;
  return `background:linear-gradient(145deg,hsl(${hue} 32% 34%),hsl(${(hue + 34) % 360} 40% 18%))`;
}

export function avStack(keys, max = 3, onCard = false) {
  const shown = keys.slice(0, max);
  return `<span class="av-stack${onCard ? " av-stack-card" : ""}">
    ${shown.map((k) => avatar(k, 28)).join("")}</span>`;
}

export const userName = (key) =>
  `${esc(USERS[key] ? USERS[key].name : key)}${isMember(key) ? " " + memberTick() : ""}`;

export const memberTick = (size = 13) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24"
  aria-label="Member" style="display:inline-block;vertical-align:-2px;flex:none">
  <circle cx="12" cy="12" r="9.4" fill="var(--act)"/>
  <path d="m8.1 12.3 2.6 2.6 5.2-5.6" fill="none" stroke="var(--on-act)" stroke-width="2.1"
    stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ------------------------------------------------------------- structure */
export const pageTitle = (t, sub) => `
  <h1 class="title">${esc(t)}</h1>
  ${sub ? `<p class="title-sub">${esc(sub)}</p>` : ""}`;

export const sectionHead = (t, link) => `
  <div class="head"><span class="label">${esc(t)}</span>
  ${link ? `<a class="head-link" href="${link.href}">${esc(link.label)}</a>` : ""}</div>`;

export const empty = (name, title, sub, action) => `
  <div class="empty">
    <span class="ico">${icon(name)}</span>
    <div><div class="empty-t">${esc(title)}</div>
      <p class="empty-s" style="margin-top:7px">${esc(sub)}</p></div>
    ${action ? `<a class="btn btn-soft btn-sm" href="${action.href}">${esc(action.label)}</a>` : ""}
  </div>`;

export const note = (text, tone = "quiet") =>
  `<div class="note${tone === "warn" ? " note-warn" : ""}">
     ${icon(tone === "warn" ? "info" : "shield")}<span>${esc(text)}</span></div>`;

/* ------------------------------------------------------------ event cards */
const priceOf = (ev) => {
  const min = Math.min(...ev.tiers.map((t) => t.price));
  return min === 0 ? "Free" : `from ${money(min)}`;
};

export const saveBtn = (id) => `<button class="ev-save" data-save="${id}" type="button"
  aria-pressed="${isSaved(id)}" aria-label="Save event">${iconFill("bookmark", 16)}</button>`;

/** The full-width card: the default way an event appears. */
export function eventCard(ev, { why } = {}) {
  return `
  ${why ? `<div class="ev-why">${icon("sparkle")}<span>${esc(why)}</span></div>` : ""}
  <div class="ev-wrap">
  <a class="ev" href="#/event/${ev.id}" aria-label="${esc(ev.title)}, ${esc(ev.when)}">
    <span class="cover">${cover(ev)}
      <span class="ev-top">
        <span class="ev-chips">
          ${ev.soon ? `<span class="live"><i class="dot"></i>Tonight</span>`
                    : `<span class="badge">${icon(catIcon(ev.cat), 12)}${esc(catLabel(ev.cat))}</span>`}
        </span>
      </span>
      <span class="ev-title">${esc(ev.title)}</span>
    </span>
    <span class="ev-body">
      <span class="ev-when">${icon("clock", 14)}<span class="clip">${esc(ev.when)} · ${esc(ev.venue)}</span></span>
      <span class="ev-foot">
        <span class="row" style="gap:8px">
          ${ev.friends?.length ? avStack(ev.friends, 3, true) : ""}
          <span class="small">${compact(ev.going)} going</span>
        </span>
        <span class="ev-price">${priceOf(ev)}</span>
      </span>
    </span>
  </a>
  ${saveBtn(ev.id)}
  </div>`;
}

/** The 4:5 card used inside a horizontal rail. */
export const railCard = (ev) => `
  <div class="ev-wrap ev-sm-wrap">
  <a class="ev ev-sm" href="#/event/${ev.id}" aria-label="${esc(ev.title)}">
    <span class="cover">${cover(ev, { w: 560 })}
      <span class="ev-top"><span class="ev-chips">
        ${ev.soon ? `<span class="live"><i class="dot"></i>Tonight</span>`
                  : `<span class="badge">${esc(ev.when.split(" · ")[0])}</span>`}
      </span></span>
      <span class="ev-title">${esc(ev.title)}</span>
      <span class="ev-sm-meta">
        <span class="clip">${esc(ev.venue)}</span>
        <span class="strong">${priceOf(ev)}</span>
      </span>
    </span>
  </a>
  ${saveBtn(ev.id)}
  </div>`;

/** The compact horizontal row, for lists where the photo is a thumbnail. */
export const eventRow = (ev, sub) => `
  <a class="ev-row" href="#/event/${ev.id}" aria-label="${esc(ev.title)}">
    <span class="cover">${cover(ev, { w: 300 })}</span>
    <span class="row-copy">
      <span class="row-t clip-2">${esc(ev.title)}</span>
      <span class="row-s clip">${esc(sub || ev.when + " · " + ev.venue)}</span>
      <span class="row-s strong" style="color:var(--ink)">${priceOf(ev)}</span>
    </span>
    <span class="row-go">${icon("fwd")}</span>
  </a>`;

/* ------------------------------------------------------------- post cards */
export function postCard(p) {
  const u = USERS[p.author] || { name: p.author };
  /* A post with a picture shows the poster of the night it is about — which is
     both true and the only image we actually have a right to. */
  const art = p.photo && p.photo.startsWith("cov:")
    ? poster({ id: hashStr(String(p.id)) % 9999, cat: p.photo.slice(4), title: p.id })
    : null;
  return `<article class="card post">
    <div class="post-head">
      <a href="#/u/${p.author}">${avatar(p.author, 38)}</a>
      <div class="row-copy">
        <a class="row-t" href="#/u/${p.author}">${userName(p.author)}</a>
        <span class="row-s">${esc(p.ago)}${p.eventId ? " · went" : ""}</span>
      </div>
    </div>
    <p class="lede" style="font-size:14.5px">${esc(p.text)}</p>
    ${art ? `<div class="post-photo cover">${art}</div>` : ""}
    <div class="post-acts">
      <button class="post-act" type="button" data-like="${p.id}"
        aria-pressed="false">${icon("heart", 16)}<span>${p.likes}</span></button>
      <span class="post-act">${icon("chat", 16)}<span>${p.replies}</span></span>
    </div>
  </article>`;
}

/* --------------------------------------------------------------- the bar */
/* Two shapes only: the place header on a tab root, and a back bar on anything
   pushed. Anything else in the bar would be a third thing to learn. */
export const barPlace = (city, { bell = 0 } = {}) => `
  <a class="bar-brand" href="#/explore" aria-label="Change city">
    <span class="bar-mark">${brandMark(26)}</span>
    <span class="bar-place">
      <span class="bar-place-k">You are in</span>
      <span class="bar-place-v">${esc(city)}${icon("down", 13)}</span>
    </span>
  </a>
  <span class="bar-actions">
    <a class="gbtn" href="#/notifications" aria-label="Notifications">${icon("bell")}
      ${bell ? '<i class="gbtn-n"></i>' : ""}</a>
    <a class="gbtn" href="#/explore" data-search aria-label="Search">${icon("search")}</a>
  </span>`;

export const barBack = (title, right = "") => `
  <span class="row" style="gap:11px;min-width:0;flex:1">
    <button class="gbtn" type="button" data-back aria-label="Back">${icon("back")}</button>
    <span class="bar-title clip">${esc(title || "")}</span>
  </span>
  <span class="bar-actions">${right}</span>`;

/* A tab root's bar. The title is not printed here — it lives in the page as a
   large heading and slides UP into this bar as that heading scrolls away, the
   way iOS has done it since 11. Which means the bar is never empty chrome, and
   there is never a back arrow on a screen you cannot go back from. */
export const barRoot = (title, right = "") => `
  <span class="row" style="gap:10px;min-width:0;flex:1">
    <span class="bar-mark">${brandMark(24)}</span>
    <span class="bar-title bar-title-slide clip">${esc(title)}</span>
  </span>
  <span class="bar-actions">${right}</span>`;

/* The "e." mark, inline, so it never waits on a network round trip. */
export const brandMark = (size = 26) => `
<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" aria-hidden="true">
  <g transform="matrix(0.79929,0,0,-0.79929,188.694,733.403)">
    <path fill="currentColor" d="M580 235H175Q180 175 217.0 141.0Q254 107 308 107Q386 107 419 174H570Q546 94 478.0 42.5Q410 -9 311 -9Q231 -9 167.5 26.5Q104 62 68.5 127.0Q33 192 33 277Q33 363 68.0 428.0Q103 493 166.0 528.0Q229 563 311 563Q390 563 452.5 529.0Q515 495 549.5 432.5Q584 370 584 289Q584 259 580 235ZM439 329Q438 383 400.0 415.5Q362 448 307 448Q255 448 219.5 416.5Q184 385 176 329Z"/>
  </g>
  <circle cx="759.43" cy="683.90" r="49.5" fill="var(--ember)"/>
</svg>`;

export { plural, compact };
