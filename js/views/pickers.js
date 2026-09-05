/* Where you are. A country wheel and its cities, plus the one question that
   changes the feed: do you live here, or are you visiting. */

import { state, save } from "../store.js";
import { COUNTRIES } from "../data/geo.js";
import { eventsForCity } from "../data/events.js";
import { esc } from "../util.js";
import { icon } from "../icons.js";
import { sheet, closeSheet, toast } from "../ui.js";
import { go, refresh } from "../router.js";
import { haptic, commit } from "../motion.js";

export function openCityPicker() {
  let ci = state.country;

  const render = () => `
    <div class="sheet-t">Where are you?</div>

    <div class="rail" style="margin-bottom:6px">
      ${COUNTRIES.map((c, i) => `
        <button class="chip" type="button" data-country="${i}" aria-pressed="${i === ci}">
          <span aria-hidden="true">${c.flag}</span>${esc(c.name)}</button>`).join("")}
    </div>

    <div class="label" style="padding:20px 0 10px">Cities</div>
    <div class="stack" style="gap:8px" id="cities">
      ${COUNTRIES[ci].cities.map((city, i) => {
        const on = ci === state.country && i === state.cityIdx;
        const n = eventsForCity(city).length;
        return `
        <button class="row-btn" type="button" data-city="${i}"
          style="background:var(--wash)">
          <span class="ico">${icon("pin")}</span>
          <span class="row-copy">
            <span class="row-t" style="font-size:14.5px">${esc(city)}</span>
            <span class="row-s">${n} ${n === 1 ? "event" : "events"}</span>
          </span>
          <span class="row-go" style="color:var(--ink);opacity:${on ? 1 : 0}">${icon("check", 18)}</span>
        </button>`;
      }).join("")}
    </div>

    <div class="label" style="padding:22px 0 10px">I am</div>
    <div class="seg" id="mode">
      <button type="button" data-mode="live" aria-pressed="${!state.visiting}">Living here</button>
      <button type="button" data-mode="visit" aria-pressed="${state.visiting}">Just visiting</button>
    </div>

    <p class="tiny" style="padding-top:16px">San Francisco is hand-written. Every other city
      generates its own catalogue from its name, so it is the same city on every visit.</p>`;

  sheet(render, {
    label: "Choose a city",
    mount(el) {
      /* The listener lives on the sheet itself, so swapping its children out
         from under it costs nothing and needs no re-binding. */
      const repaint = () => { el.innerHTML = `<div class="grab"></div>${render()}`; };

      el.addEventListener("click", (e) => {
        const c = e.target.closest("[data-country]");
        if (c) { haptic(6); ci = +c.dataset.country; repaint(); return; }

        const city = e.target.closest("[data-city]");
        if (city) {
          haptic(8);
          state.country = ci;
          state.cityIdx = +city.dataset.city;
          save(); closeSheet(); commit();
          toast(`Now showing ${COUNTRIES[ci].cities[state.cityIdx]}`, "pin");
          go("#/");
          return;
        }

        const m = e.target.closest("[data-mode]");
        if (m) { haptic(6); state.visiting = m.dataset.mode === "visit"; save(); repaint(); }
      });
    },
  });
}
