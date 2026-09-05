/* Where you are, and what that means for the feed. Shared by home, explore and
   the city picker, so all three agree on the same answer. */

import { state } from "./store.js";
import { COUNTRIES } from "./data/geo.js";
import { eventsForCity } from "./data/events.js";
import { USERS } from "./data/people.js";

export const cityName = () => COUNTRIES[state.country].cities[state.cityIdx];
export const countryName = () => COUNTRIES[state.country].name;
export const cityEvents = () => eventsForCity(cityName());

/* Why this event, for this person, right now. A feed without a reason is just a
   list; the reason is what makes it feel like the app knows you. */
export function reason(ev) {
  const f = (ev.friends || []).filter((k) => state.followingUsers[k] && !state.blocked[k]);
  if (f.length >= 2) return `${USERS[f[0]].name.split(" ")[0]} and ${f.length - 1} more are going`;
  if (f.length === 1) return `${USERS[f[0]].name.split(" ")[0]} is going`;
  if (state.followingHosts[ev.host]) return `From ${ev.host}, who you follow`;
  if (ev.soon) return "Starting tonight, near you";
  if (ev.minPrice === 0) return "Free, and close by";
  if (ev.member) return "A members-only night";
  return `Popular in ${ev.cat === "Food" ? "food & drink" : (ev.catLabel || ev.cat).toLowerCase()} this week`;
}

function score(ev) {
  let s = ev.going / 30;
  (ev.friends || []).forEach((k) => { if (state.followingUsers[k]) s += 14; });
  if (state.followingHosts[ev.host]) s += 10;
  if (ev.soon) s += 8;
  if (state.saved.includes(ev.id)) s += 4;
  if (ev.member && !state.member) s -= 6;
  return s;
}

export function feedFor(kind) {
  const all = cityEvents();
  if (kind === "following") {
    return all.filter((ev) =>
      state.followingHosts[ev.host] ||
      (ev.friends || []).some((k) => state.followingUsers[k] && !state.blocked[k]));
  }
  return all.slice().sort((a, b) => score(b) - score(a));
}

/* Soonest first, and wide enough to be a rail rather than a lone card. */
const SOON = ["Tonight", "Tomorrow", "Fri", "Sat", "Sun"];
export const soonRank = (e) => {
  const i = SOON.findIndex((d) => e.when.startsWith(d));
  return i === -1 ? 99 : i;
};
export const happeningSoon = (n = 8) => cityEvents()
  .filter((e) => e.soon || soonRank(e) < 99)
  .sort((a, b) => soonRank(a) - soonRank(b) || b.going - a.going)
  .slice(0, n);
