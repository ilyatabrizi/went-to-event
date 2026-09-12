/* Choose a ticket → pay → confirmed. Three screens, and the running total is
   visible on every one of them. */

import { state, save, isMember } from "../store.js";
import { byId } from "../data/events.js";
import { esc, money, amount, plural } from "../util.js";
import { icon } from "../icons.js";
import { sectionHead, cover, note, lazyImages } from "../parts.js";
import { stepperHTML, stepper, toast } from "../ui.js";
import { go, refresh } from "../router.js";
import { haptic, commit } from "../motion.js";

const FEE = 2.5;                      // per ticket, waived for members

export const curTier = (ev) => ev.tiers[Math.min(state.tierIdx, ev.tiers.length - 1)];
const feeFor = () => (state.member ? 0 : FEE * state.qty);
const totalFor = (ev) => curTier(ev).price * state.qty + feeFor();

const METHODS = [
  { key: "apple", name: "Apple Pay", sub: "Face ID", ico: "apple" },
  { key: "card", name: "Visa · 4242", sub: "Expires 09/29", ico: "card" },
  { key: "wallet", name: "Went balance", sub: "$40.00 available", ico: "wallet" },
];

/* ------------------------------------------------------- 1. which ticket */
export default function booking({ id }) {
  const ev = byId(+id);
  state.eventId = ev.id;
  if (state.tierIdx >= ev.tiers.length) state.tierIdx = 0;
  const free = ev.minPrice === 0 && ev.tiers.length === 1;

  const html = `
  <div class="wrap">
    <h1 class="title">${free ? "RSVP" : "Choose a ticket"}</h1>
    <p class="title-sub">${esc(ev.title)} · ${esc(ev.dateLong)}</p>

    <section class="section">
      ${sectionHead(free ? "Entry" : "Ticket type")}
      <div class="stack" style="gap:9px" role="radiogroup" aria-label="Ticket type">
        ${ev.tiers.map((t, i) => `
          <button class="card card-pad row" type="button" role="radio" data-tier="${i}"
            aria-checked="${i === state.tierIdx}"
            style="text-align:left;${i === state.tierIdx
              ? "box-shadow:inset 0 0 0 2px var(--act),var(--shadow-2)" : ""}">
            <span class="row-copy">
              <span class="row-t">${esc(t.name)}</span>
              <span class="row-s">${esc(t.desc)}</span>
            </span>
            <span class="strong money">${money(t.price)}</span>
          </button>`).join("")}
      </div>
    </section>

    <section class="section">
      ${sectionHead("How many")}
      <div class="card card-pad spread">
        <span class="row-copy">
          <span class="row-t">Tickets</span>
          <span class="row-s">Up to 10 per person</span>
        </span>
        <span id="qty">${stepperHTML(state.qty)}</span>
      </div>
    </section>

    ${!state.member ? `
      <section class="section">
        ${note(`A ${amount(FEE)} booking fee applies per ticket. Membership removes it.`)}
      </section>` : ""}
  </div>`;

  return {
    html, tabs: false,
    bar: { back: true, title: "Booking" },
    dock: dockFor(ev, `#/checkout/${ev.id}`, "Continue"),
    mount(el) {
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-tier]");
        if (!b) return;
        haptic(6);
        state.tierIdx = +b.dataset.tier;
        save();
        refresh();
      });
      stepper(el.querySelector("#qty .stepper"), {
        value: state.qty, min: 1, max: 10,
        onChange(n) { state.qty = n; save(); paintDock(ev, `#/checkout/${ev.id}`, "Continue"); },
      });
    },
  };
}

/* ------------------------------------------------------------ 2. checkout */
export function checkout({ id }) {
  const ev = byId(+id);
  const t = curTier(ev);
  const sub = t.price * state.qty;

  const html = `
  <div class="wrap">
    <h1 class="title">Checkout</h1>
    <p class="title-sub">${esc(ev.title)}</p>

    <section class="section">
      ${sectionHead("Paying with")}
      <div class="stack" style="gap:9px" role="radiogroup" aria-label="Payment method">
        ${METHODS.map((m, i) => `
          <button class="card card-pad row" type="button" role="radio" data-method="${i}"
            aria-checked="${i === state.methodIdx}"
            style="text-align:left;${i === state.methodIdx
              ? "box-shadow:inset 0 0 0 2px var(--act),var(--shadow-2)" : ""}">
            <span class="ico">${icon(m.ico)}</span>
            <span class="row-copy">
              <span class="row-t">${esc(m.name)}</span>
              <span class="row-s">${esc(m.sub)}</span>
            </span>
            ${i === state.methodIdx ? `<span class="row-go" style="color:var(--ink)">${icon("check", 18)}</span>` : ""}
          </button>`).join("")}
      </div>
    </section>

    <section class="section">
      ${sectionHead("Summary")}
      <div class="card card-pad stack" style="gap:11px">
        <div class="spread"><span class="small">${esc(t.name)} × ${state.qty}</span>
          <span class="money">${amount(sub)}</span></div>
        <div class="spread"><span class="small">Booking fee${state.member ? " · waived" : ""}</span>
          <span class="money" style="${state.member ? "color:var(--mute);text-decoration:line-through" : ""}">
            ${amount(state.member ? FEE * state.qty : feeFor())}</span></div>
        <div class="spread" style="padding-top:11px;border-top:1px solid var(--line)">
          <span class="strong">Total</span>
          <span class="strong money" style="font-size:17px">${amount(totalFor(ev))}</span></div>
      </div>
    </section>

    <section class="section">
      ${note("Payment is stubbed in this preview. Nothing is charged and no card is contacted.")}
    </section>
  </div>`;

  return {
    html, tabs: false,
    bar: { back: true, title: "Checkout" },
    dock: `<button class="btn btn-primary" type="button" data-pay="${ev.id}">
      ${icon("lock", 17)} Pay ${amount(totalFor(ev))}</button>`,
    mount(el) {
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-method]");
        if (!b) return;
        haptic(6);
        state.methodIdx = +b.dataset.method;
        save();
        refresh();
      });
    },
  };
}

/* --------------------------------------------------------- 3. confirmed */
export function confirm({ id }) {
  const ev = byId(+id);
  const t = curTier(ev);

  const html = `
  <div class="wrap" style="padding-top:8vh">
    <div style="display:grid;justify-items:center;text-align:center;gap:18px">
      <span id="mark" style="width:88px;height:88px;border-radius:50%;display:grid;place-items:center;
        background:var(--act);color:var(--on-act)">
        ${icon("check", 40)}</span>
      <div>
        <h1 class="display d-2">You are going.</h1>
        <p class="title-sub" style="margin-inline:auto;text-align:center">
          ${esc(ev.title)} · ${esc(ev.dateLong)}</p>
      </div>
    </div>

    <div class="card card-pad stack" style="gap:11px;margin-top:30px">
      <div class="spread"><span class="small">Ticket</span><span class="strong">${esc(t.name)}</span></div>
      <div class="spread"><span class="small">How many</span>
        <span class="strong">${state.qty} ${plural(state.qty, "ticket")}</span></div>
      <div class="spread"><span class="small">Where</span><span class="strong">${esc(ev.venue)}</span></div>
      <div class="spread" style="padding-top:11px;border-top:1px solid var(--line)">
        <span class="small">Paid</span>
        <span class="strong money">${amount(totalFor(ev))}</span></div>
    </div>

    <p class="tiny" style="text-align:center;padding-top:20px">
      A copy would normally land in your email. Not in a preview.</p>
  </div>`;

  return {
    html, tabs: false,
    bar: { close: true, title: "" },
    dock: `<div class="dock-row">
      <button class="btn btn-soft" type="button" data-go="#/" style="flex:none;width:112px">Done</button>
      <button class="btn btn-primary" type="button" data-go="#/pass/0" style="flex:1">View ticket</button>
    </div>`,
    mount(el) {
      const mark = el.querySelector("#mark");
      if (mark) {
        mark.animate(
          [{ transform: "scale(.5)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
          { duration: 520, easing: "cubic-bezier(.34,1.4,.64,1)", fill: "both" });
      }
    },
  };
}

/* -------------------------------------------------------------- the dock */
function dockFor(ev, href, label) {
  return `<div class="dock-row">
    <span class="row-copy" style="padding-left:6px">
      <span class="row-s">${state.qty} × ${esc(curTier(ev).name)}</span>
      <span class="row-t money" id="dockTotal">${amount(totalFor(ev))}</span>
    </span>
    <button class="btn btn-primary" type="button" data-go="${href}"
      style="flex:none;width:150px">${label}</button>
  </div>`;
}

/* The quantity stepper changes the total without changing the screen, so the
   dock is repainted in place rather than through a re-render. */
function paintDock(ev) {
  const out = document.querySelector("#dockTotal");
  if (out) out.textContent = amount(totalFor(ev));
  const sub = out?.previousElementSibling;
  if (sub) sub.textContent = `${state.qty} × ${curTier(ev).name}`;
}

export { totalFor, FEE };
