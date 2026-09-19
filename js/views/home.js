/* HOME — the landing screen, and the only place events are discovered.
 *
 * Explore merged into it: measured in the running app, Explore's eleven events
 * were a strict subset of Home's eighteen, and its two rails were 100%
 * duplication of the list beneath them. Two tabs, one dataset, no unique
 * content — so one screen, with the search and the chips Explore had.
 *
 * THE LEAD IS EXCLUDED FROM THE LIST BELOW IT. The old Home put its hero in a
 * rail 700px below itself and again in the feed below that. */

import { state, save } from "../store.js";
import { CATS } from "../data/geo.js";
import { esc, money, compact } from "../util.js";
import { icon } from "../icons.js";
import { cityName, cityEvents } from "../place.js";
import { entry, plate, head, chip, search, tagLive, empty } from "../parts.js";
import { barCity } from "../parts.js";
import { refresh } from "../router.js";
import { haptic } from "../motion.js";
import { openFilters, filterCount } from "./pickers.js";

/* ---------------------------------------------------------------- filters */
export const WHEN  = ["Any time", "Tonight", "This week", "This weekend"];
export const PRICE = ["Any price", "Free", "Under $25"];
export const SORT  = ["Soonest", "Nearest", "Price"];

export function results() {
  let list = cityEvents().slice();
  const q = state.query.trim().toLowerCase();

  if (q) list = list.filter((e) =>
    `${e.title} ${e.host} ${e.venue} ${e.catLabel} ${e.about}`.toLowerCase().includes(q));
  if (state.cat) list = list.filter((e) => e.cat === state.cat);

  if (state.whenIdx === 1) list = list.filter((e) => e.dayOffset === 0);
  if (state.whenIdx === 2) list = list.filter((e) => e.dayOffset <= 6);
  if (state.whenIdx === 3) list = list.filter((e) => e.dayLabel === "Saturday"
    || e.dayLabel === "Sunday" || e.dayLabel === "Friday");

  if (state.priceIdx === 1) list = list.filter((e) => e.minPrice === 0);
  if (state.priceIdx === 2) list = list.filter((e) => e.minPrice < 25);

  if (state.sortIdx === 0) list.sort((a, b) => a.dayOffset - b.dayOffset || b.going - a.going);
  if (state.sortIdx === 1) list.sort((a, b) => a.dist - b.dist);
  if (state.sortIdx === 2) list.sort((a, b) => a.minPrice - b.minPrice);
  return list;
}

const searching = () =>
  !!state.query.trim() || !!state.cat || filterCount() > 0;

/* ------------------------------------------------------------------- body */
/* Only the body repaints while typing — re-rendering the screen would blur the
   field on every keystroke and lose the caret. */
export function homeBody() {
  const list = results();

  if (searching()) {
    if (!list.length) {
      return `<div class="wrap s5">${empty("search", "Nothing matches",
        `Nothing in ${cityName()} fits that. Try a broader word, or clear the filters.`)}</div>`;
    }
    return `
      <div class="wrap s5">
        ${head(`${list.length} ${list.length === 1 ? "result" : "results"}`)}
        ${list.map((e) => entry(e, { tag: e.dayOffset === 0 ? "Tonight" : "" })).join("")}
      </div>`;
  }

  const lead = list[0];
  const rest = list.slice(1);

  /* Grouped under day heads — a listings page, not a column of dates. */
  const groups = [];
  rest.forEach((e) => {
    const g = groups.find((x) => x.label === e.dayLabel);
    if (g) g.items.push(e); else groups.push({ label: e.dayLabel, items: [e] });
  });

  return `
    ${lead ? `
      <div class="wrap s5">${plate(lead)}</div>
      <a class="wrap stack s4" href="#/event/${lead.id}">
        ${lead.dayOffset === 0 ? tagLive("Tonight") : `<span class="tag t-5 c-ash">${esc(lead.dayLabel)}</span>`}
        <span class="t-1 clip-2 s2">${esc(lead.title)}</span>
        <span class="t-5 c-ash s2">${esc(lead.when.split(" · ").pop())} · ${esc(lead.venue)} ·
          <b class="c-bone w-600">${lead.minPrice === 0 ? "Free" : `from ${money(lead.minPrice)}`}</b></span>
      </a>` : ""}

    ${groups.map((g, i) => `
      <div class="wrap ${i === 0 ? "s6" : "s7"}">
        ${head(g.label, { open: true })}
        ${g.items.map((e) => entry(e, { tag: e.dayOffset === 0 ? "Tonight" : "" })).join("")}
      </div>`).join("")}
    <div class="s8"></div>`;
}

/* ------------------------------------------------------------------ view */
export default function home() {
  const n = filterCount();
  const html = `
    <div class="wrap s4">${search({ placeholder: `Search ${cityName()}`, value: state.query })}</div>
    <div class="rail s3">
      ${chip(`Filters${n ? "" : ""}`, { on: n > 0, data: "data-filters", n: n || null })}
      ${chip("All", { on: !state.cat, data: 'data-cat=""' })}
      ${CATS.map((c) => chip(c.label, { on: state.cat === c.key, data: `data-cat="${c.key}"` })).join("")}
    </div>
    <div id="body">${homeBody()}</div>`;

  return {
    html,
    bar: { kind: "city" },
    mount(el) {
      const body = el.querySelector("#body");
      const input = el.querySelector("#q");
      const repaint = () => { body.innerHTML = homeBody(); };

      let t = 0;
      input?.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => { state.query = input.value; repaint(); }, 150);
      });

      el.addEventListener("click", (e) => {
        const c = e.target.closest("[data-cat]");
        if (c) {
          haptic(6);
          const key = c.dataset.cat;
          state.cat = key && key !== state.cat ? key : null;
          save(); refresh();
          return;
        }
        if (e.target.closest("[data-filters]")) openFilters(() => refresh());
      });

      if (state.focusSearch) { state.focusSearch = false; input?.focus(); }
    },
  };
}
