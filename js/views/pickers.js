/* The two sheets: CITY and FILTERS.
 *
 * City is ONE list — a search field, Recent, then every city under sticky
 * country heads. The 2-up grid of city cards and its twenty supporting classes
 * are gone: the same sheet already listed every city underneath them, and the
 * file's own comment conceded that people search rather than browse. */

import { state, save } from "../store.js";
import { COUNTRIES } from "../data/geo.js";
import { eventsForCity } from "../data/events.js";
import { esc } from "../util.js";
import { icon } from "../icons.js";
import { row, rowTick, head, search, chip, btn } from "../parts.js";
import { sheet, closeSheet } from "../ui.js";
import { go, refresh } from "../router.js";
import { haptic, impact } from "../motion.js";

const PLACES = COUNTRIES.flatMap((c, ci) =>
  c.cities.map((city, i) => ({ city, country: c.name, ci, i })));

/* ------------------------------------------------------------------ CITY */
export function openCityPicker() {
  let q = "";
  const here = () => COUNTRIES[state.country].cities[state.cityIdx];

  const cityRow = (p) => row({
    title: esc(p.city),
    trail: `<span class="t-5 c-ash">${eventsForCity(p.city).length}</span>${
      p.ci === state.country && p.i === state.cityIdx ? rowTick() : ""}`,
    attrs: `data-ci="${p.ci}" data-i="${p.i}" aria-checked="${
      p.ci === state.country && p.i === state.cityIdx}"`,
    kind: "destination",
  });

  const body = () => {
    const t = q.trim().toLowerCase();
    const found = t
      ? PLACES.filter((p) => p.city.toLowerCase().includes(t) || p.country.toLowerCase().includes(t))
      : PLACES;

    if (!found.length) {
      return `<p class="t-5 c-ash s5">Nothing matches “${esc(q.trim())}”. Try the country instead.</p>`;
    }

    const recents = t ? [] : (state.recentCities || [])
      .map((n) => PLACES.find((p) => p.city === n)).filter(Boolean).slice(0, 3);

    const by = new Map();
    found.filter((p) => !recents.some((r) => r.city === p.city))
      .forEach((p) => {
        if (!by.has(p.country)) by.set(p.country, []);
        by.get(p.country).push(p);
      });

    return `
      ${recents.length ? `${head("Recent")}${recents.map(cityRow).join("")}` : ""}
      ${[...by.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([country, ps], i) => `
        <div class="${i === 0 && !recents.length ? "" : "s5"}">${head(country, { open: i > 0 || !!recents.length })}</div>
        ${ps.map(cityRow).join("")}`).join("")}`;
  };

  const render = () => `
    <div class="sheet-t t-2">City</div>
    ${search({ id: "pq", placeholder: "Search any city or country", value: q })}
    <div id="pbody" class="s5">${body()}</div>`;

  sheet(render, {
    label: "Choose a city",
    mount(el) {
      const repaint = () => { el.querySelector("#pbody").innerHTML = body(); };
      let t = 0;
      el.querySelector("#pq")?.addEventListener("input", (e) => {
        clearTimeout(t);
        t = setTimeout(() => { q = e.target.value; repaint(); }, 140);
      });
      el.addEventListener("click", (e) => {
        const p = e.target.closest("[data-ci]");
        if (!p) return;
        impact();
        state.country = +p.dataset.ci;
        state.cityIdx = +p.dataset.i;
        const name = here();
        state.recentCities = [name, ...(state.recentCities || []).filter((c) => c !== name)].slice(0, 6);
        state.query = ""; state.cat = null;
        save(); closeSheet(); go("#/"); refresh();
      });
    },
  });
}

/* --------------------------------------------------------------- FILTERS */
/* "Recommended" is gone from Sort: it duplicated the premise of the feed
   inside a filter control, and offering both was the two screens admitting
   they overlapped. */
export const filterCount = () =>
  (state.whenIdx ? 1 : 0) + (state.priceIdx ? 1 : 0) + (state.sortIdx ? 1 : 0);

export function openFilters(onApply) {
  const groups = [
    { key: "whenIdx", label: "When", items: ["Any", "Tonight", "This week", "This weekend"] },
    { key: "priceIdx", label: "Price", items: ["Any", "Free", "Under $25"] },
    { key: "sortIdx", label: "Sort", items: ["Soonest", "Nearest", "Price"] },
  ];

  const render = () => `
    <div class="sheet-t t-2">Filters</div>
    ${groups.map((g, gi) => `
      <div class="${gi ? "s6" : ""}">${head(g.label, { open: gi > 0 })}</div>
      <div class="rail rail--wrap">
        ${g.items.map((label, i) =>
          chip(label, { on: state[g.key] === i, data: `data-g="${g.key}" data-i="${i}"` })).join("")}
      </div>`).join("")}
    <div class="sheet-foot">
      ${btn("Reset", { kind: "text", id: "clear" })}
      <span class="grow"></span>
      ${btn("Show results", { kind: "primary", attrs: "data-close" })}
    </div>`;

  sheet(render, {
    label: "Filters",
    onClose: onApply,
    mount(el) {
      el.addEventListener("click", (e) => {
        const c = e.target.closest("[data-g]");
        if (c) {
          haptic(6);
          state[c.dataset.g] = +c.dataset.i;
          save();
          el.innerHTML = `<div class="grab"></div>${render()}`;
          return;
        }
        if (e.target.closest("#clear")) {
          state.whenIdx = state.priceIdx = state.sortIdx = 0;
          save();
          el.innerHTML = `<div class="grab"></div>${render()}`;
        }
      });
    },
  });
}
