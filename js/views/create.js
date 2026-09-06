/* Publishing is the product's reason to exist, so the flow is four short steps
   with a visible spine and a live preview of the card being made. */

import { state, save, me } from "../store.js";
import { CATS, catIcon, catLabel } from "../data/geo.js";
import { addEvent, nextId, byId } from "../data/events.js";
import { esc, money, amount } from "../util.js";
import { icon } from "../icons.js";
import { cityName } from "../place.js";
import { cover, sectionHead, lazyImages, note } from "../parts.js";
import { toast } from "../ui.js";
import { go, refresh } from "../router.js";
import { haptic, commit } from "../motion.js";

export const STEPS = ["The basics", "When", "Where", "Artwork", "Entry"];

export const blankDraft = () => ({
  step: 0, title: "", cat: "Nightlife", date: "", time: "", venue: "",
  city: cityName(), paid: false, price: "", about: "",
  art: 0, photo: null,     /* which generated poster, or a photo of your own */
});

export function stepValid(d) {
  if (d.step === 0) return !!d.title.trim();
  if (d.step === 1) return !!d.date.trim();
  if (d.step === 2) return !!d.venue.trim();
  return true;   /* artwork and entry both have working defaults */
}

export default function create() {
  if (!state.create) state.create = blankDraft();
  const d = state.create;
  const last = d.step === STEPS.length - 1;

  const preview = {
    id: 777, cat: d.cat, title: d.title || "Your event",
    when: (d.date || "Date TBC") + (d.time ? " · " + d.time : ""),
    venue: d.venue || "Venue TBC", going: 1, friends: [],
    minPrice: d.paid ? parseFloat(d.price) || 0 : 0,
    userMade: true, art: d.art, photo: d.photo,
  };

  const body = [
    /* 0 — the basics */ `
      <div class="field">
        <label for="f_title">What is it called?</label>
        <input id="f_title" data-f="title" value="${esc(d.title)}" maxlength="60"
          enterkeyhint="next" placeholder="Warehouse Sessions Vol. 10">
      </div>
      <div style="padding-top:22px">
        <div class="label" style="padding-bottom:11px">What kind of event</div>
        <div class="rail" style="padding-inline:0;margin-inline:0;flex-wrap:wrap;overflow:visible">
          ${CATS.map((c) => `
            <button class="chip" type="button" data-cat="${c.key}"
              aria-pressed="${c.key === d.cat}">${icon(c.icon)}${esc(c.label)}</button>`).join("")}
        </div>
      </div>
      <div class="field" style="padding-top:22px">
        <label for="f_about">Tell people what to expect</label>
        <textarea id="f_about" data-f="about" rows="4" maxlength="400"
          placeholder="Four rooms, one raw shell on the waterfront…">${esc(d.about)}</textarea>
        <span class="field-note">Optional, but events with a description get roughly twice the RSVPs.</span>
      </div>`,

    /* 1 — when */ `
      <div class="field">
        <label for="f_date">Which day?</label>
        <input id="f_date" data-f="date" value="${esc(d.date)}" maxlength="30"
          placeholder="Sat, 14 Sep">
      </div>
      <div class="field" style="padding-top:18px">
        <label for="f_time">What time?</label>
        <input id="f_time" data-f="time" value="${esc(d.time)}" maxlength="30"
          placeholder="9:00 PM – 2:00 AM">
      </div>
      <div style="padding-top:22px">${note("Dates are free text in the preview. A real build would use a picker and store a timestamp.")}</div>`,

    /* 2 — where */ `
      <div class="field">
        <label for="f_venue">Where is it?</label>
        <input id="f_venue" data-f="venue" value="${esc(d.venue)}" maxlength="60"
          placeholder="Pier 70">
      </div>
      <div class="card card-pad row" style="margin-top:18px">
        <span class="ico">${icon("pin")}</span>
        <span class="row-copy">
          <span class="row-t">${esc(d.city)}</span>
          <span class="row-s">Published to this city’s feed</span>
        </span>
      </div>`,

    /* 3 — artwork */ `
      <p class="lede" style="font-size:14.5px;margin-bottom:18px">Every event gets a poster.
        Six are drawn for you from the kind of night it is — pick one, or use a photo of
        your own.</p>

      <div class="art-grid">
        ${[0, 1, 2, 3, 4, 5].map((n) => `
          <button class="art-opt" type="button" data-art="${n}"
            aria-pressed="${!d.photo && d.art === n}" aria-label="Poster ${n + 1}">
            ${cover({ id: 777, cat: d.cat, title: d.title || "Your event" }, { seed: n })}
            <span class="art-tick">${icon("check", 14)}</span>
          </button>`).join("")}
      </div>

      <label class="art-upload ${d.photo ? "has" : ""}" for="f_photo">
        <input id="f_photo" type="file" accept="image/*" hidden>
        ${d.photo
          ? `<img src="${esc(d.photo)}" alt="Your cover">
             <span class="art-upload-on">${icon("check", 15)} Your photo</span>
             <button class="art-clear" type="button" id="clearPhoto"
               aria-label="Remove photo">${icon("close", 15)}</button>`
          : `<span class="art-up-ico">${icon("camera", 22)}</span>
             <span class="art-up-t">Use your own photo</span>
             <span class="art-up-s">JPG or PNG · it stays on this device</span>`}
      </label>`,

    /* 4 — entry */ `
      <div class="label" style="padding-bottom:11px">Is it free or ticketed?</div>
      <div class="dock-row">
        <button class="btn ${d.paid ? "btn-soft" : "btn-primary"}" type="button" data-paid="0"
          style="flex:1;min-height:48px">Free</button>
        <button class="btn ${d.paid ? "btn-primary" : "btn-soft"}" type="button" data-paid="1"
          style="flex:1;min-height:48px">Ticketed</button>
      </div>
      ${d.paid ? `
        <div class="field" style="padding-top:20px">
          <label for="f_price">Price per ticket</label>
          <input id="f_price" data-f="price" value="${esc(d.price)}" inputmode="decimal"
            maxlength="6" placeholder="25">
        </div>
        <div class="card card-pad stack" style="gap:10px;margin-top:18px">
          <div class="spread"><span class="small">Ticket price</span>
            <span class="money" id="p_gross">${amount(parseFloat(d.price) || 0)}</span></div>
          <div class="spread"><span class="small">Platform fee · 8%</span>
            <span class="money" id="p_fee">−${amount((parseFloat(d.price) || 0) * 0.08)}</span></div>
          <div class="spread" style="padding-top:10px;border-top:1px solid var(--line)">
            <span class="strong">You keep</span>
            <span class="strong money" id="p_net">${amount((parseFloat(d.price) || 0) * 0.92)}</span></div>
        </div>` : `
        <div style="padding-top:20px">${note("Free events cost you nothing to publish, and nothing per RSVP.")}</div>`}`,
  ][d.step];

  const html = `
  <div class="wrap">
    <div class="step-bar">
      ${STEPS.map((_, i) => `<span class="step-seg${i <= d.step ? " on" : ""}"><i></i></span>`).join("")}
    </div>
    <div class="label">Step ${d.step + 1} of ${STEPS.length}</div>
    <h1 class="display d-2" style="margin-top:8px">${STEPS[d.step]}</h1>

    <section class="section">${body}</section>

    <section class="section">
      ${sectionHead("How it will look")}
      <div class="ev-wrap">
        <div class="ev">
          <div class="cover">${cover(preview)}
            <span class="ev-top"><span class="ev-chips">
              <span class="badge">${icon(catIcon(d.cat), 12)}${esc(catLabel(d.cat))}</span></span></span>
            <span class="ev-title">${esc(preview.title)}</span>
          </div>
          <div class="ev-body">
            <span class="ev-when">${icon("clock", 14)}
              <span class="clip">${esc(preview.when)} · ${esc(preview.venue)}</span></span>
            <span class="ev-foot">
              <span class="small">1 going</span>
              <span class="ev-price">${preview.minPrice === 0 ? "Free" : `from ${money(preview.minPrice)}`}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>`;

  return {
    html, tabs: false,
    bar: { back: true, title: "Publish an event" },
    dock: `<div class="dock-row">
      ${d.step > 0 ? `<button class="btn btn-soft" type="button" id="prev"
        style="flex:none;width:56px" aria-label="Back a step">${icon("back", 18)}</button>` : ""}
      <button class="btn btn-primary" type="button" id="next" style="flex:1"
        ${stepValid(d) ? "" : "disabled"}>${last ? "Publish event" : "Continue"}</button>
    </div>`,
    mount(el) {
      lazyImages(el);

      /* Typing repaints the preview and the Continue button, but must never
         re-render the screen — that would blur the field on every keystroke. */
      el.addEventListener("input", (e) => {
        const f = e.target.dataset.f;
        if (!f) return;
        d[f] = e.target.value;
        const next = document.querySelector("#next");
        if (next) next.disabled = !stepValid(d);
        paintPreview(el, d);
      });

      /* A photo never leaves the device — it is read straight into a data URL
         and kept in the draft, which is also why it is capped: a 12MP JPEG in
         localStorage would blow the quota and lose the whole draft. */
      el.querySelector("#f_photo")?.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 6 * 1024 * 1024) { toast("That photo is over 6 MB", "info"); return; }
        const fr = new FileReader();
        fr.onload = () => { d.photo = fr.result; save(); haptic(8); refresh(); };
        fr.readAsDataURL(file);
      });

      el.addEventListener("click", (e) => {
        const a = e.target.closest("[data-art]");
        if (a) {
          haptic(6); d.art = +a.dataset.art; d.photo = null; save(); refresh(); return;
        }
        if (e.target.closest("#clearPhoto")) {
          e.preventDefault(); haptic(6); d.photo = null; save(); refresh(); return;
        }
        const c = e.target.closest("[data-cat]");
        if (c) { haptic(6); d.cat = c.dataset.cat; save(); refresh(); return; }
        const p = e.target.closest("[data-paid]");
        if (p) { haptic(6); d.paid = p.dataset.paid === "1"; save(); refresh(); }
      });

      document.querySelector("#prev")?.addEventListener("click", () => {
        d.step = Math.max(0, d.step - 1); save(); refresh();
      });
      document.querySelector("#next")?.addEventListener("click", () => {
        if (!stepValid(d)) return;
        if (d.step < STEPS.length - 1) { d.step++; haptic(8); save(); refresh(); return; }
        publish(d);
      });
    },
  };
}

function paintPreview(el, d) {
  /* The payout is the reason this step exists, so it tracks the field on every
     keystroke. A figure that only catches up on the next render is silently
     wrong exactly while somebody is reading it. */
  const n = parseFloat(d.price) || 0;
  const gross = el.querySelector("#p_gross"), fee = el.querySelector("#p_fee"),
        net = el.querySelector("#p_net");
  if (gross) gross.textContent = amount(n);
  if (fee) fee.textContent = "−" + amount(n * 0.08);
  if (net) net.textContent = amount(n * 0.92);

  const t = el.querySelector(".ev-title");
  if (t) t.textContent = d.title || "Your event";
  const w = el.querySelector(".ev-when .clip");
  if (w) w.textContent = `${(d.date || "Date TBC") + (d.time ? " · " + d.time : "")} · ${d.venue || "Venue TBC"}`;
  const p = el.querySelector(".ev-price");
  if (p) {
    const n = d.paid ? parseFloat(d.price) || 0 : 0;
    p.textContent = n === 0 ? "Free" : `from ${money(n)}`;
  }
}

function publish(d) {
  const price = d.paid ? parseFloat(d.price) || 0 : 0;
  const ev = {
    id: nextId(), cat: d.cat, title: d.title.trim(), host: "You", hostEvents: 1,
    when: (d.date || "Date TBC") + (d.time ? " · " + d.time.split(" – ")[0] : ""),
    dateLong: d.date || "Date TBC", timeRange: d.time || "Time TBC",
    venue: d.venue || "Venue TBC", address: `${d.venue}, ${d.city}`, dist: 0.4,
    going: 1, friends: [], userMade: true, art: d.art, photo: d.photo,
    about: d.about.trim() || "A new event on Went To Event.",
    tiers: price > 0
      ? [{ name: "General", desc: "Standard entry", price }]
      : [{ name: "RSVP", desc: "Free entry", price: 0 }],
  };
  addEvent(ev, d.city);
  state.publishedId = ev.id;
  state.create = null;
  save(); commit();
  go("#/published");
}

/* ------------------------------------------------------------ published */
export function published() {
  const ev = state.publishedId ? byId(state.publishedId) : null;
  const html = `
  <div class="wrap" style="padding-top:8vh">
    <div style="display:grid;justify-items:center;text-align:center;gap:18px">
      <span style="width:88px;height:88px;border-radius:50%;display:grid;place-items:center;
        background:var(--ember-wash);box-shadow:inset 0 0 0 1px var(--ember-line);color:var(--ember)">
        ${icon("check", 40)}</span>
      <div>
        <h1 class="display d-2">It is live.</h1>
        <p class="title-sub" style="text-align:center;margin:0 auto">
          ${esc(ev ? ev.title : "Your event")} is now in the ${esc(cityName())} feed.</p>
      </div>
    </div>

    <div class="card card-pad stack" style="gap:11px;margin-top:30px">
      <div class="spread"><span class="small">Where it shows</span><span class="strong">Explore & Home</span></div>
      <div class="spread"><span class="small">Who can see it</span><span class="strong">Everyone in ${esc(cityName())}</span></div>
      <div class="spread"><span class="small">You keep</span>
        <span class="strong money">${ev && ev.minPrice > 0 ? amount(ev.minPrice * 0.92) + " per ticket" : "Nothing to collect"}</span></div>
    </div>

    <p class="tiny" style="text-align:center;padding-top:20px">
      Nothing left this device — the event lives in this preview only.</p>
  </div>`;

  return {
    html, tabs: false,
    bar: { close: true, title: "" },
    dock: `<div class="dock-row">
      <button class="btn btn-soft" type="button" data-go="#/you" style="flex:none;width:112px">Done</button>
      ${ev ? `<a class="btn btn-primary" href="#/event/${ev.id}" style="flex:1">See the event</a>` : ""}
    </div>`,
  };
}
