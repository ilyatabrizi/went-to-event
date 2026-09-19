/* The twelve components. This is the closed set — a screen that needs a
   thirteenth is a screen whose design does not belong to the system.

   THE ARBITER SENTENCE: there are no cards. If it has artwork worth looking at
   it is a PLATE, and there is one per screen. If it is an event it is an ENTRY.
   Everything else is a ROW.

   THE THREE SELECTED STATES, one per shape:
     Chip → Bone fill, Ink text.  Row → a Bone tick in the trailing slot.
     Tile → an inset Bone ring.   There is no fourth. */

import { esc, money, compact, initials } from "./util.js";
import { icon } from "./icons.js";
import { poster } from "./artwork.js";
import { USERS } from "./data/people.js";

/* ------------------------------------------------------------- 1. ENTRY */
/* Every event, in every list, on every screen. */
export function entry(ev, { past = false, tag = "", href = null } = {}) {
  const price = ev.minPrice === 0 ? "Free" : `from ${money(ev.minPrice)}`;
  const facts = past
    ? (tag || "Attended")
    : `<b class="c-bone w-600">${price}</b> · ${compact(ev.going)} going`;
  return `
  <a class="entry${past ? " entry--past" : ""}" href="${href || `#/event/${ev.id}`}">
    <span class="entry-thumb">${poster(ev, { ratio: "1/1", seed: ev.art || 0 })}</span>
    <span class="entry-copy">
      <span class="entry-t t-3 clip-2">${esc(ev.title)}</span>
      <span class="t-5 c-ash clip">${esc(ev.when)} · ${esc(ev.venue)}</span>
      <span class="t-5 c-ash">${tag && !past ? tagLive(tag) + " · " : ""}${facts}</span>
    </span>
  </a>`;
}

/* ------------------------------------------------------------- 2. PLATE */
/* Exactly twice in the app. NO TYPE SITS ON A PLATE. */
export const plate = (ev) =>
  `<div class="plate">${poster(ev, { ratio: "25/16", seed: ev.art || 0 })}</div>`;

/* ------------------------------------------------- 3. SECTION HEAD */
export const head = (title, { open = false } = {}) =>
  `<div class="head t-5 w-600 c-ash${open ? " head--open" : ""}">${esc(title)}</div>`;

/* -------------------------------------------------------------- 6. TAG */
/* A tag is text, not a lozenge. */
export const tagLive = (label = "Tonight") =>
  `<span class="tag tag--live t-5 w-600"><i></i>${esc(label)}</span>`;
export const tag = (label) => `<span class="tag t-5 c-ash">${esc(label)}</span>`;

/* -------------------------------------------------------------- 7. ROW */
/* The title's weight encodes the row's kind: 400 when it is a DESTINATION,
   600 when it IS CONTENT. The hairline is derived from --lead, never typed. */
export function row({ lead = "", title, sub = "", trail = "", kind = "content",
                      href = null, attrs = "", cls = "" } = {}) {
  const t = `<span class="t-4 ${kind === "content" ? "w-600" : ""}">${title}</span>`;
  const body = `
    ${lead ? `<span class="row-lead">${lead}</span>` : "<span></span>"}
    <span class="row-copy">${t}${sub ? `<span class="t-5 c-ash">${sub}</span>` : ""}</span>
    <span class="row-trail">${trail}</span>`;
  const c = `row ${cls}`.trim();
  return href
    ? `<a class="${c}" href="${href}" ${attrs}>${body}</a>`
    : `<button class="${c}" type="button" ${attrs}>${body}</button>`;
}

export const rowTick = () => `<span class="row-tick">${icon("check", 20)}</span>`;
export const chevron = () => icon("fwd", 16);

/* ------------------------------------------------------------- 8. MARK */
/* Neutral. An hsl(hash) avatar puts 360 unowned colours into a five-colour
   brand; a glyph in a row is an icon in --ash, not a Mark. */
export function mark(who, size = 2) {
  const u = USERS[who];
  const label = u ? (u.initials || initials(u.name)) : initials(String(who));
  return `<span class="mark mark--${size}">${esc(label)}</span>`;
}
export const markIcon = (name, size = 3) =>
  `<span class="mark mark--${size}">${icon(name, size >= 3 ? 24 : 20)}</span>`;

/* ------------------------------------------------------------ 5. CHIP */
export const chip = (label, { on = false, data = "", n = null } = {}) =>
  `<button class="chip t-5 w-500" type="button" aria-pressed="${on}" ${data}>${esc(label)}${
    n != null ? `<span class="chip-n">${n}</span>` : ""}</button>`;

/* ----------------------------------------------------------- 9. FIELD */
export const field = ({ label = "", note = "", id = "", type = "text",
                        value = "", placeholder = "", area = false, attrs = "" } = {}) => `
  <label class="field">
    ${label ? `<span class="field-label t-5 w-600 c-ash">${esc(label)}</span>` : ""}
    ${area
      ? `<textarea class="field-c t-4" id="${id}" placeholder="${esc(placeholder)}" ${attrs}>${esc(value)}</textarea>`
      : `<input class="field-c t-4" id="${id}" type="${type}" value="${esc(value)}"
           placeholder="${esc(placeholder)}" ${attrs}>`}
    ${note ? `<span class="field-note t-5 c-ash">${esc(note)}</span>` : ""}
  </label>`;

export const search = ({ id = "q", placeholder = "Search", value = "" } = {}) => `
  <div class="search">${icon("search", 20)}
    <input class="field-c t-4" id="${id}" type="search" autocomplete="off"
      placeholder="${esc(placeholder)}" value="${esc(value)}" aria-label="${esc(placeholder)}">
  </div>`;

/* ---------------------------------------------------------- 12. EMPTY */
export const empty = (glyph, title, sub, action) => `
  <div class="empty">
    ${markIcon(glyph, 3)}
    <div class="t-2">${esc(title)}</div>
    <p class="t-5 c-ash">${esc(sub)}</p>
    ${action ? `<a class="btn btn--quiet btn--sm t-5 w-600" href="${action.href}">${esc(action.label)}</a>` : ""}
  </div>`;

/* --------------------------------------------------------------- BUTTON */
export const btn = (label, { kind = "primary", block = false, sm = false,
                             href = null, attrs = "", id = "" } = {}) => {
  const cls = `btn btn--${kind}${block ? " btn--block" : ""}${sm ? " btn--sm" : ""} ` +
              `${sm || kind === "text" ? "t-5" : "t-4"} w-600`;
  return href
    ? `<a class="${cls}" href="${href}" ${id ? `id="${id}"` : ""} ${attrs}>${label}</a>`
    : `<button class="${cls}" type="button" ${id ? `id="${id}"` : ""} ${attrs}>${label}</button>`;
};

/* ----------------------------------------------------------------- BAR */
/* Two configurations, no third. The page never repeats the bar title as an h1. */
export const barCity = (city) => `
  <button class="bar-city t-4 w-600" type="button" data-city>${esc(city)}${icon("down", 16)}</button>
  <span></span>`;

export const barTitle = (title, right = "") =>
  `<span class="bar-t t-4 w-600 clip">${esc(title)}</span><span>${right}</span>`;

export const barBack = (title, right = "") => `
  <span class="bar-lead">
    <button class="bar-back" type="button" data-back aria-label="Back">${icon("back", 24)}</button>
    <span class="bar-t t-4 w-600 clip">${esc(title)}</span>
  </span>
  <span>${right}</span>`;

/* The "e." mark. Its Ember dot is one of the accent's four uses, and it appears
   on the pass and the publish success screen only. */
export const brandMark = (size = 22) => `
<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" aria-hidden="true">
  <g transform="matrix(0.79929,0,0,-0.79929,188.694,733.403)">
    <path fill="currentColor" d="M580 235H175Q180 175 217.0 141.0Q254 107 308 107Q386 107 419 174H570Q546 94 478.0 42.5Q410 -9 311 -9Q231 -9 167.5 26.5Q104 62 68.5 127.0Q33 192 33 277Q33 363 68.0 428.0Q103 493 166.0 528.0Q229 563 311 563Q390 563 452.5 529.0Q515 495 549.5 432.5Q584 370 584 289Q584 259 580 235ZM439 329Q438 383 400.0 415.5Q362 448 307 448Q255 448 219.5 416.5Q184 385 176 329Z"/>
  </g>
  <circle cx="759.43" cy="683.90" r="49.5" fill="var(--ember)"/>
</svg>`;

export { poster, money, compact };
