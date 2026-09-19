/* State, what survives a reload, and a way for the shell to keep up with it.
 *
 * Everything the audit found unread is gone: `sound` (nothing read it, and its
 * one control was labelled "Show me on events I join"), `member`, `verified`,
 * `notif`, `blocked`, `muted`, `privateAcct`, `posts`, `followingUsers` and
 * `homeFeed`. `haptics` is the one settings flag any code reads. */

import { byId } from "./data/events.js";

const KEY = "wte.v3";

const PERSIST = ["country", "cityIdx", "saved", "followingHosts", "myTickets",
                 "published", "haptics", "recentCities", "seeded"];

export const state = {
  /* place */
  country: 0, cityIdx: 0,

  /* search and filters */
  query: "", cat: null, whenIdx: 0, priceIdx: 0, sortIdx: 0, focusSearch: false,

  /* selection */
  eventId: 1, tierIdx: 0, publishedId: null, create: null,

  /* the person */
  saved: [7, 3],
  followingHosts: { "Substrata Collective": true },
  myTickets: [],
  published: [],
  haptics: true,
  recentCities: [],
  seeded: false,
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    PERSIST.forEach((k) => { if (saved[k] !== undefined) state[k] = saved[k]; });
  } catch {}
}

/* Went is the tab the product is named after; opening it to an empty screen is
   the worst first impression in the app. Two upcoming and two past, written
   once, with real dayOffsets so past is DERIVED and not a flag. */
function seed() {
  if (state.seeded) return;
  state.seeded = true;
  state.myTickets = [
    { eventId: 1,  tier: 0, qty: 2, dayOffset: 0 },
    { eventId: 4,  tier: 0, qty: 1, dayOffset: 5 },
    { eventId: 7,  tier: 0, qty: 2, dayOffset: -4 },
    { eventId: 12, tier: 0, qty: 1, dayOffset: -11 },
  ];
}

const subs = new Set();
export const subscribe = (fn) => { subs.add(fn); fn(); return () => subs.delete(fn); };
export const emit = () => subs.forEach((fn) => fn());

let saveT = 0;
export function save() {
  emit();
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try {
      const out = {};
      PERSIST.forEach((k) => { out[k] = state[k]; });
      localStorage.setItem(KEY, JSON.stringify(out));
    } catch {}
  }, 220);
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch {}
  location.hash = "#/";
  location.reload();
}

export const me = "ava";

export const isSaved = (id) => state.saved.includes(id);
export function toggleSave(id) {
  const i = state.saved.indexOf(id);
  if (i > -1) state.saved.splice(i, 1); else state.saved.unshift(id);
  save();
  return i === -1;
}

export const followsHost = (name) => !!state.followingHosts[name];
export function toggleHost(name) {
  if (state.followingHosts[name]) delete state.followingHosts[name];
  else state.followingHosts[name] = true;
  save();
  return !!state.followingHosts[name];
}

/* Do you already hold a ticket to this? The dock reads it, and it is why a
   commit never needs a confirmation screen. */
export const holds = (eventId) => state.myTickets.some((t) => t.eventId === eventId);

load();
seed();

/* events.js imports geo, util and people — never this file — so a direct
   import here is acyclic. */
export const myEvents = () => state.published.map(byId).filter(Boolean);
