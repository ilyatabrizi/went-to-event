/* Explore. Search, the fifteen categories, and a filter sheet — with the
   browse rails standing in whenever nothing has been asked for yet. */

import { state, save } from "../store.js";
import { CATS, catIcon, catLabel } from "../data/geo.js";
import { esc, compact } from "../util.js";
import { icon } from "../icons.js";
import { cityName, cityEvents } from "../place.js";
import { eventCard, eventRow, railCard, sectionHead, empty, lazyImages } from "../parts.js";
import { sheet, closeSheet } from "../ui.js";
import { go, refresh } from "../router.js";
import { haptic } from "../motion.js";

export const WHEN  = ["Any time", "Tonight", "This weekend", "Next 7 days"];
export const PRICE = ["Any price", "Free", "Under $25", "Under $50"];
export const SORT  = ["Recommended", "Soonest", "Nearest", "Price: low to high", "Most going"];

export const filtersActive = () =>
  (state.whenIdx ? 1 : 0) + (state.priceIdx ? 1 : 0) + (state.sortIdx ? 1 : 0);

export function results() {
  let list = cityEvents().slice();
  const q = state.query.trim().toLowerCase();

  if (q) {
    list = list.filter((e) =>
      `${e.title} ${e.host} ${e.venue} ${e.catLabel} ${e.about}`.toLowerCase().includes(q));
  }
  if (state.cat) list = list.filter((e) => e.cat === state.cat);

  if (state.whenIdx === 1) list = list.filter((e) => /Tonight/.test(e.when));
  if (state.whenIdx === 2) list = list.filter((e) => /Sat|Sun|Tonight|Tomorrow/.test(e.when));
  if (state.whenIdx === 3) list = list.filter((e) => !/Next/.test(e.when));

  if (state.priceIdx === 1) list = list.filter((e) => e.minPrice === 0);
  if (state.priceIdx === 2) list = list.filter((e) => e.minPrice < 25);
  if (state.priceIdx === 3) list = list.filter((e) => e.minPrice < 50);

  const s = state.sortIdx;
  if (s === 1) list.sort((a, b) => (/Tonight/.test(b.when) ? 1 : 0) - (/Tonight/.test(a.when) ? 1 : 0));
  if (s === 2) list.sort((a, b) => a.dist - b.dist);
  if (s === 3) list.sort((a, b) => a.minPrice - b.minPrice);
  if (s === 4) list.sort((a, b) => b.going - a.going);
  return list;
}

/* Only the body re-renders while typing — re-rendering the whole screen would
   blur the input on every keystroke and lose the caret. */
export function exploreBody() {
  const list = results();
  const q = state.query.trim();
  const idle = !q && !state.cat && !filtersActive();

  if (idle) {
    const free = cityEvents().filter((e) => e.minPrice === 0).slice(0, 5);
    const near = cityEvents().slice().sort((a, b) => a.dist - b.dist).slice(0, 5);
    const counts = {};
    cityEvents().forEach((e) => { counts[e.cat] = (counts[e.cat] || 0) + 1; });
    /* Empty categories sink to the bottom — a grid that offers you nothing is
       worse than a shorter grid. */
    const cats = CATS.slice().sort((a, b) => (counts[b.key] || 0) - (counts[a.key] || 0));

    return `
      <section class="section">
        <div class="wrap">${sectionHead("Browse by category")}</div>
        <div class="wrap grid-2">
          ${cats.map((c) => `
            <button class="card card-flat row" type="button" data-cat="${c.key}"
              style="padding:14px;gap:11px;text-align:left">
              <span class="ico">${icon(c.icon)}</span>
              <span class="row-copy">
                <span class="row-t" style="font-size:14px">${esc(c.label)}</span>
                <span class="row-s" style="font-size:12px">${
                  counts[c.key] ? `${counts[c.key]} ${counts[c.key] === 1 ? "event" : "events"}`
                                : "Nothing yet"}</span>
              </span>
            </button>`).join("")}
        </div>
      </section>

      ${free.length ? `
        <section class="section">
          <div class="wrap">${sectionHead("Free this week")}</div>
          <div class="rail">${free.map(railCard).join("")}</div>
        </section>` : ""}

      ${near.length ? `
        <section class="section wrap">
          ${sectionHead("Closest to you")}
          <div class="rows">${near.map((e) => eventRow(e, `${e.dist} km · ${e.venue}`)).join("")}</div>
        </section>` : ""}`;
  }

  if (!list.length) {
    return `<section class="section">${empty("search", "No matches",
      q ? `Nothing in ${cityName()} matches “${q}”. Try a broader word, or clear the filters.`
        : `No events in ${cityName()} fit those filters yet.`)}</section>`;
  }

  return `
    <section class="section wrap">
      ${sectionHead(`${list.length} ${list.length === 1 ? "result" : "results"}${
        state.cat ? " · " + catLabel(state.cat) : ""}`)}
      <div class="stack" style="gap:20px">${list.map((e) => eventCard(e)).join("")}</div>
    </section>`;
}

export default function explore() {
  const n = filtersActive();
  const html = `
    <div class="wrap">
      <h1 class="title">Explore</h1>
      <div style="margin-top:18px" class="search">
        ${icon("search")}
        <input id="q" type="search" inputmode="search" autocomplete="off"
          placeholder="Search ${esc(cityName())}" aria-label="Search events"
          value="${esc(state.query)}">
        ${state.query ? `<button type="button" id="qclear" class="row-go"
          aria-label="Clear search">${icon("close", 16)}</button>` : ""}
      </div>
    </div>

    <div class="rail" style="margin-top:14px">
      <button class="chip" type="button" id="filters" aria-pressed="${n > 0}">
        ${icon("slider")}Filters${n ? ` <span class="chip-n">${n}</span>` : ""}</button>
      ${state.cat ? `<button class="chip" type="button" data-cat="" aria-pressed="true">
        ${icon(catIcon(state.cat))}${esc(catLabel(state.cat))}${icon("close", 13)}</button>` : ""}
      ${CATS.slice(0, 8).filter((c) => c.key !== state.cat).map((c) => `
        <button class="chip" type="button" data-cat="${c.key}" aria-pressed="false">
          ${icon(c.icon)}${esc(c.label)}</button>`).join("")}
    </div>

    <div id="body">${exploreBody()}</div>`;

  return {
    html,
    mount(el) {
      lazyImages(el);
      const body = el.querySelector("#body");
      const input = el.querySelector("#q");

      const repaint = () => { body.innerHTML = exploreBody(); lazyImages(body); };

      let t = 0;
      input?.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => { state.query = input.value; repaint(); toggleClear(); }, 180);
      });
      const toggleClear = () => {
        if (!!el.querySelector("#qclear") === !!state.query.trim()) return;
        refresh();                    // the clear button appears/disappears
      };
      el.querySelector("#qclear")?.addEventListener("click", () => {
        state.query = ""; refresh();
      });

      el.addEventListener("click", (e) => {
        const c = e.target.closest("[data-cat]");
        if (!c) return;
        haptic(6);
        const key = c.dataset.cat;
        state.cat = key === state.cat || key === "" ? null : key;
        refresh();
      });

      el.querySelector("#filters")?.addEventListener("click", () => openFilters(repaint));
      if (state.focusSearch) { state.focusSearch = false; input?.focus(); }
    },
  };
}

/* ---------------------------------------------------------- filter sheet */
export function openFilters(onApply) {
  const group = (id, items, active) => `
    <div class="label" style="padding:18px 0 10px">${id}</div>
    <div class="stack" style="gap:8px">
      ${items.map((label, i) => `
        <button class="row-btn" type="button" data-f="${id}" data-i="${i}"
          style="background:var(--wash)">
          <span class="row-copy"><span class="row-t" style="font-size:14.5px">${esc(label)}</span></span>
          <span class="row-go" style="color:var(--ink);opacity:${i === active ? 1 : 0}">
            ${icon("check", 18)}</span>
        </button>`).join("")}
    </div>`;

  sheet(`
    <div class="sheet-t">Filters</div>
    ${group("When", WHEN, state.whenIdx)}
    ${group("Price", PRICE, state.priceIdx)}
    ${group("Sort", SORT, state.sortIdx)}
    <div class="dock-row" style="padding-top:22px">
      <button class="btn btn-soft" type="button" id="clear" style="flex:none;width:112px">Clear</button>
      <button class="btn btn-primary" type="button" data-close style="flex:1">Show results</button>
    </div>`, {
    label: "Filters",
    onClose: onApply,
    mount(el) {
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-f]");
        if (b) {
          haptic(6);
          const i = +b.dataset.i;
          if (b.dataset.f === "When") state.whenIdx = i;
          if (b.dataset.f === "Price") state.priceIdx = i;
          if (b.dataset.f === "Sort") state.sortIdx = i;
          save();
          el.querySelectorAll(`[data-f="${b.dataset.f}"] .row-go`).forEach((g, gi) => {
            g.style.opacity = gi === i ? 1 : 0;
          });
        }
        if (e.target.closest("#clear")) {
          state.whenIdx = state.priceIdx = state.sortIdx = 0;
          save(); closeSheet();
        }
      });
    },
  });
}
