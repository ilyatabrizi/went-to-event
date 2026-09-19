/* PUBLISH — two steps and a success, in one route.
 *
 * Five steps for six fields became two. The live preview card is DELETED, not
 * moved: it was the stated justification for the step count and it sat at
 * y=826 on an 812px viewport, so nobody ever saw the card being built while
 * typing. The progress bar is the label — there is no "Step 1 of 2" and no
 * step title above it. */

import { state, save } from "../store.js";
import { CATS } from "../data/geo.js";
import { addEvent, nextId, byId } from "../data/events.js";
import { esc, money, amount } from "../util.js";
import { cityName } from "../place.js";
import { poster, POSTER_SEEDS } from "../artwork.js";
import { field, chip, row, rowTick, btn, plate, head, brandMark, tagLive } from "../parts.js";
import { refresh, go } from "../router.js";
import { haptic, impact, success } from "../motion.js";

export const blankDraft = () => ({
  step: 0, title: "", cat: "Nightlife", date: "", time: "", venue: "",
  city: cityName(), paid: false, price: "", art: 0,
});

export const stepValid = (d) =>
  d.step === 0 ? !!(d.title.trim() && d.date.trim() && d.venue.trim()) : true;

export default function create() {
  if (!state.create) state.create = blankDraft();
  const d = state.create;

  if (d.step === 2) return published();

  const steps = `<div class="steps s5"><i class="on"></i><i class="${d.step >= 1 ? "on" : ""}"></i></div>`;

  const body = d.step === 0 ? `
    <div class="stack s6">
      ${field({ label: "Event name", id: "f_title", value: d.title,
                placeholder: "Warehouse Sessions Vol. 10", attrs: 'data-f="title" maxlength="60"' })}
      <div class="s5">
        <div class="field-label t-5 w-600 c-ash">Kind of event</div>
        <div class="rail rail--wrap s3">
          ${CATS.map((c) => chip(c.label, { on: c.key === d.cat, data: `data-cat="${c.key}"` })).join("")}
        </div>
      </div>
      <div class="s5">${field({ label: "Date", id: "f_date", value: d.date,
        placeholder: "Sat, 14 Sep", attrs: 'data-f="date" maxlength="30"' })}</div>
      <div class="s5">${field({ label: "Time", id: "f_time", value: d.time,
        placeholder: "9:00 PM – 2:00 AM", attrs: 'data-f="time" maxlength="30"' })}</div>
      <div class="s5">${field({ label: "Venue", id: "f_venue", value: d.venue,
        placeholder: "Pier 70", attrs: 'data-f="venue" maxlength="60"' })}</div>
    </div>`
  : `
    <div class="s6">
      <div class="field-label t-5 w-600 c-ash">Artwork</div>
      <div class="tiles s3">
        ${POSTER_SEEDS.map((s) => `
          <button class="tile" type="button" data-art="${s}" aria-pressed="${d.art === s}"
            aria-label="Artwork ${s + 1}">${poster({ id: 777, title: d.title || "x" },
            { ratio: "3/4", seed: s })}</button>`).join("")}
      </div>
    </div>
    <div class="s6">${head("Entry", { open: true })}</div>
    ${row({ title: "Free", attrs: `data-paid="0" aria-checked="${!d.paid}"`,
            trail: rowTick() })}
    ${row({ title: "Ticketed", attrs: `data-paid="1" aria-checked="${d.paid}"`,
            trail: rowTick() })}
    ${d.paid ? `
      <div class="s5">${field({ label: "Price per ticket", id: "f_price", value: d.price,
        placeholder: "25", attrs: 'data-f="price" inputmode="decimal" maxlength="6"' })}</div>
      <p class="t-5 c-ash s3" id="keep">${keepLine(d)}</p>` : ""}`;

  return {
    html: `<div class="wrap">${steps}${body}<div class="s8"></div></div>`,
    tabs: false,
    bar: { kind: "back", title: "Publish" },
    dock: btn(d.step === 0 ? "Continue" : "Publish",
      { kind: "primary", block: true, id: "next", attrs: stepValid(d) ? "" : "disabled" }),
    mount(el) {
      el.addEventListener("input", (e) => {
        const f = e.target.dataset.f;
        if (!f) return;
        d[f] = e.target.value;
        const next = document.querySelector("#next");
        if (next) next.disabled = !stepValid(d);
        const keep = el.querySelector("#keep");
        if (keep) keep.textContent = keepLine(d);
      });

      el.addEventListener("click", (e) => {
        const c = e.target.closest("[data-cat]");
        if (c) { haptic(6); d.cat = c.dataset.cat; save(); refresh(); return; }
        const a = e.target.closest("[data-art]");
        if (a) { haptic(6); d.art = +a.dataset.art; save(); refresh(); return; }
        const p = e.target.closest("[data-paid]");
        if (p) { haptic(6); d.paid = p.dataset.paid === "1"; save(); refresh(); }
      });

      document.querySelector("#next")?.addEventListener("click", () => {
        if (!stepValid(d)) return;
        if (d.step === 0) { d.step = 1; impact(); save(); refresh(); return; }
        publish(d);
      });
    },
  };
}

/* The only money statement in the app, and the only one that tells a host
   something true. */
function keepLine(d) {
  const n = parseFloat(d.price) || 0;
  return n > 0
    ? `You keep ${amount(n * 0.92)} of a ${amount(n)} ticket.`
    : "Set a price to see what you keep.";
}

function publish(d) {
  const price = d.paid ? parseFloat(d.price) || 0 : 0;
  const ev = {
    id: nextId(), cat: d.cat, title: d.title.trim(), host: "You", hostEvents: 1,
    when: `${d.date || "Later"} · ${(d.time || "").split(" – ")[0] || "TBC"}`,
    dateLong: d.date || "Date TBC", timeRange: d.time || "Time TBC",
    venue: d.venue || "Venue TBC", address: `${d.venue}, ${d.city}`, dist: 0.4,
    going: 1, friends: [], userMade: true, art: d.art,
    about: "A new event on Went To Event.",
    tiers: price > 0
      ? [{ name: "General", desc: "Standard entry", price }]
      : [{ name: "RSVP", desc: "Free entry", price: 0 }],
  };
  addEvent(ev, d.city);
  state.published.unshift(ev.id);
  state.publishedId = ev.id;
  d.step = 2;
  save(); success();
  refresh();
}

/* Success lives in the same route, as step three. */
function published() {
  const ev = state.publishedId ? byId(state.publishedId) : null;
  const html = `
  <div class="wrap center s7">
    ${brandMark(40)}
    <div class="t-2 s5">It's live</div>
  </div>
  ${ev ? `
    <div class="wrap s6">${plate(ev)}</div>
    <div class="wrap stack s4">
      <span class="tag t-5 c-ash">${esc(ev.dayLabel || "Later")}</span>
      <span class="t-1 clip-2 s2">${esc(ev.title)}</span>
      <span class="t-5 c-ash s2">${esc(ev.venue)} ·
        <b class="c-bone w-600">${ev.minPrice === 0 ? "Free" : `from ${money(ev.minPrice)}`}</b></span>
    </div>` : ""}
  <div class="wrap s7">
    ${btn("See it on Home", { kind: "quiet", block: true, href: "#/", id: "done" })}
    <div class="s8"></div>
  </div>`;

  return {
    html, tabs: false, bar: { kind: "back", title: "Published" },
    mount() { state.create = null; save(); },
  };
}
