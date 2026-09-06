/* Where you are.

   The old version asked you to find your country in a horizontal rail of thirty
   flag emoji, then read a plain list of city names. Two things were wrong with
   that: emoji flags render differently on every platform and read as clip art,
   and nobody scans a rail — they search. So this one searches every city in the
   world by default, shows the places you have actually been at the top, and
   gives each city the same generated art the rest of the app uses, so the
   choice looks like a choice rather than a settings row. */

import { state, save } from "../store.js";
import { COUNTRIES } from "../data/geo.js";
import { eventsForCity } from "../data/events.js";
import { esc } from "../util.js";
import { icon } from "../icons.js";
import { poster } from "../artwork.js";
import { sheet, closeSheet, toast } from "../ui.js";
import { go } from "../router.js";
import { haptic, commit } from "../motion.js";

/* Flat index of everywhere, built once. */
const PLACES = COUNTRIES.flatMap((c, ci) =>
  c.cities.map((city, i) => ({ city, country: c.name, code: c.code, ci, i })));

const CATS_FOR = ["Nightlife", "Music", "Food", "Art", "Outdoors", "Markets"];

/* A city's card art: the same poster engine, seeded on the city name, so a
   place looks the same every time you open this sheet. */
const cityArt = (city, n) =>
  poster({ id: 700 + (city.length * 13) % 400, cat: CATS_FOR[city.length % CATS_FOR.length], title: city });

export function openCityPicker() {
  let q = "";

  const current = () => `${COUNTRIES[state.country].cities[state.cityIdx]}`;

  const card = (p) => {
    const n = eventsForCity(p.city).length;
    const on = p.ci === state.country && p.i === state.cityIdx;
    return `
      <button class="place" type="button" data-ci="${p.ci}" data-i="${p.i}"
        aria-pressed="${on}" aria-label="${esc(p.city)}, ${esc(p.country)}">
        <span class="place-art">${cityArt(p.city)}</span>
        <span class="place-body">
          <span class="place-city">${esc(p.city)}</span>
          <span class="place-meta">${esc(p.code)} · ${n} ${n === 1 ? "event" : "events"}</span>
        </span>
        ${on ? `<span class="place-on">${icon("check", 15)}</span>` : ""}
      </button>`;
  };

  const results = () => {
    const t = q.trim().toLowerCase();
    if (!t) return null;
    return PLACES.filter((p) =>
      p.city.toLowerCase().includes(t) || p.country.toLowerCase().includes(t)).slice(0, 24);
  };

  const body = () => {
    const found = results();

    if (found) {
      return found.length
        ? `<div class="place-grid">${found.map(card).join("")}</div>`
        : `<div class="place-none">
             <div class="empty-t" style="font-size:18px">No such place</div>
             <p class="small" style="margin-top:6px">Nothing matches “${esc(q.trim())}”.
               Try the country instead.</p>
           </div>`;
    }

    /* Idle: where you have been, then the cities with the most on. */
    const recents = (state.recentCities || [])
      .map((name) => PLACES.find((p) => p.city === name)).filter(Boolean).slice(0, 4);
    const busiest = PLACES
      .filter((p) => !recents.some((r) => r.city === p.city))
      .map((p) => ({ p, n: eventsForCity(p.city).length }))
      .sort((a, b) => b.n - a.n).slice(0, 10).map((x) => x.p);

    return `
      ${recents.length ? `
        <span class="label rows-label">Recent</span>
        <div class="place-grid">${recents.map(card).join("")}</div>` : ""}
      <span class="label rows-label" style="${recents.length ? "margin-top:22px;display:block" : ""}">
        ${recents.length ? "Busiest right now" : "Where the most is on"}</span>
      <div class="place-grid">${busiest.map(card).join("")}</div>`;
  };

  const render = () => `
    <div class="sheet-head-row">
      <div>
        <div class="sheet-t" style="padding:0">Where to?</div>
        <div class="sheet-sub">Currently ${esc(current())}</div>
      </div>
      <button class="gbtn" type="button" data-close aria-label="Close">${icon("close", 18)}</button>
    </div>

    <div class="search">
      ${icon("search")}
      <input id="pq" type="search" inputmode="search" autocomplete="off"
        placeholder="Search any city or country" aria-label="Search places" value="${esc(q)}">
    </div>

    <div id="pbody" class="place-body-wrap">${body()}</div>

    <div class="place-foot">
      <span class="label" style="display:block;padding-bottom:9px">I am</span>
      <div class="seg" id="mode">
        <button type="button" data-mode="live" aria-pressed="${!state.visiting}">Living here</button>
        <button type="button" data-mode="visit" aria-pressed="${state.visiting}">Just visiting</button>
      </div>
    </div>`;

  sheet(render, {
    label: "Choose a place",
    mount(el) {
      el.classList.add("sheet-tall");
      const input = el.querySelector("#pq");
      const pbody = el.querySelector("#pbody");

      let t = 0;
      input.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => { q = input.value; pbody.innerHTML = body(); }, 140);
      });

      el.addEventListener("click", (e) => {
        const p = e.target.closest("[data-ci]");
        if (p) {
          haptic(8);
          state.country = +p.dataset.ci;
          state.cityIdx = +p.dataset.i;
          const name = COUNTRIES[state.country].cities[state.cityIdx];
          /* Remember it, most recent first, without duplicates. */
          state.recentCities = [name, ...(state.recentCities || []).filter((c) => c !== name)].slice(0, 6);
          save(); closeSheet(); commit();
          toast(`Now showing ${name}`, "pin");
          go("#/");
          return;
        }
        const m = e.target.closest("[data-mode]");
        if (m) {
          haptic(6);
          state.visiting = m.dataset.mode === "visit";
          save();
          el.querySelectorAll("[data-mode]").forEach((b) =>
            b.setAttribute("aria-pressed", String(b === m)));
        }
      });
    },
  });
}
