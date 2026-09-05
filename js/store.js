/* State, what survives a reload, and a way for the chrome to keep up with it. */

import { CONVOS, NOTIFS, POSTS, ME } from "./data/people.js";

const KEY = "wte.v2";

/* Deliberately not the whole state — a demo should reopen where you left it,
   not halfway through a checkout. */
const PERSIST = ["country", "cityIdx", "visiting", "saved", "followingUsers", "followingHosts",
                 "member", "posts", "myTickets", "blocked", "muted", "notif", "sound",
                 "haptics", "seenBoot", "privateAcct", "homeFeed", "installDismissed"];

export const state = {
  /* place */
  country: 0, cityIdx: 0, visiting: false,

  /* explore */
  query: "", cat: null, whenIdx: 0, priceIdx: 0, sortIdx: 0,

  /* selection + flows */
  eventId: 1, tierIdx: 0, qty: 1, methodIdx: 0,
  homeFeed: "foryou", wentTab: "upcoming", profileTab: "posts",
  threadUser: null, profileUser: null, publishedId: null,

  /* the person */
  saved: [7, 3],
  followingUsers: { maya: true, theo: true, jules: true, kenji: true },
  followingHosts: { "Substrata Collective": true, "The Assembly": true, "Ridgeline Run Club": true },
  blocked: {}, muted: {},
  member: false, privateAcct: false,
  posts: [], myTickets: [],
  notif: { starting: true, friends: true, hosts: false, messages: true, drops: false },
  sound: true, haptics: true, seenBoot: false, installDismissed: false,

  /* drafts */
  create: null, composeText: "", draftPhoto: null,
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    PERSIST.forEach((k) => { if (saved[k] !== undefined) state[k] = saved[k]; });
  } catch {}
}

/* ------------------------------------------------------------ subscribers */
/* The bars and the dock have to stay in step with state no matter which view
   is on screen. They subscribe once; everything that mutates calls save(). */
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

/* Runtime collections — mutated, never persisted, so the demo data stays
   pristine for whoever opens the link next. */
export const convos = CONVOS.map((c) => ({ ...c, msgs: c.msgs.slice() }));
export const notifs = NOTIFS.map((n) => ({ ...n }));

export const me = ME;
export const isMember = (key) => (key === ME ? state.member : false);

export const unreadChats = () =>
  convos.reduce((a, c) => a + (c.unread && !state.blocked[c.user] ? 1 : 0), 0);
export const unreadNotifs = () => notifs.filter((n) => n.unread).length;
export const convoOf = (key) => convos.find((c) => c.user === key);

export const allPosts = () => state.posts.concat(POSTS)
  .filter((p) => !state.blocked[p.author] && !state.muted[p.author]);

export const isSaved = (id) => state.saved.includes(id);
export function toggleSave(id) {
  const i = state.saved.indexOf(id);
  if (i > -1) state.saved.splice(i, 1); else state.saved.unshift(id);
  save();
  return i === -1;
}

export const isFollowing = (key) => !!state.followingUsers[key];
export function toggleFollow(key) {
  if (state.followingUsers[key]) delete state.followingUsers[key];
  else state.followingUsers[key] = true;
  save();
  return !!state.followingUsers[key];
}

export const followsHost = (name) => !!state.followingHosts[name];
export function toggleHost(name) {
  if (state.followingHosts[name]) delete state.followingHosts[name];
  else state.followingHosts[name] = true;
  save();
  return !!state.followingHosts[name];
}

export const ticketCount = () => state.myTickets.filter((t) => !t.past).length;

load();
