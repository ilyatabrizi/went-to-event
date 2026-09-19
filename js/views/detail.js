/* EVENT — the one screen whose job is to convert.
 *
 * Three deciding facts inside the first screen: when, where, what it costs.
 * The two exit ramps that used to sit here ("More from the host", "Similar
 * events") are gone, along with the 470px hero that carried the title and a
 * category word the user already knew, and the 150px invented street grid that
 * sat under an address line already giving the address and the distance.
 *
 * A COMMIT NEVER YANKS YOU TO A NEW SCREEN. RSVP flips the dock to "View
 * ticket" in place; paying does the same after the sheet dismisses. One rule,
 * no branching, and one fewer surface. */

import { state, save, isSaved, toggleSave, followsHost, toggleHost, holds } from "../store.js";
import { byId } from "../data/events.js";
import { esc, money, compact } from "../util.js";
import { icon } from "../icons.js";
import {
  plate, head, row, rowTick, mark, entry, btn, barBack, tagLive, tag,
} from "../parts.js";
import { sheet, closeSheet } from "../ui.js";
import { refresh, go } from "../router.js";
import { haptic, impact, success } from "../motion.js";

/* Selecting a tier only matters when there is more than one. */
const tierOf = (ev) => ev.tiers[Math.min(state.tierIdx, ev.tiers.length - 1)];
const needsSheet = (ev) => ev.tiers.length > 1 || ev.minPrice > 0;

export default function detail({ id }) {
  const ev = byId(+id);
  state.eventId = ev.id;
  const going = holds(ev.id);
  const saved = isSaved(ev.id);

  const facts = `
    <div class="t-4 w-600">${esc(ev.dateLong)} · ${esc(ev.timeRange)}</div>
    <a class="t-5 c-ash s1" href="https://maps.apple.com/?q=${encodeURIComponent(ev.address)}"
       target="_blank" rel="noopener">${esc(ev.venue)} · ${esc(ev.address)} · ${ev.dist} km</a>
    <div class="s1" id="facts-money">
      <span class="t-4 w-600">${ev.minPrice === 0 ? "Free" : `from ${money(ev.minPrice)}`}</span><span
        class="t-5 c-ash"> · ${compact(ev.going)} going</span>${
        going ? ` <span class="t-5 c-ash">· </span>${tag("Going")}` : ""}
    </div>`;

  const html = `
  <div class="wrap">${plate(ev)}</div>

  <div class="wrap s4">
    <h1 class="t-1 clip-2">${esc(ev.title)}</h1>
    <div class="tag-row s2">
      ${ev.dayOffset === 0 ? tagLive("Tonight") : ""}
      ${tag(ev.catLabel)}
    </div>
    <div class="s4">${facts}</div>

    <div class="s6">${head("About", { open: true })}</div>
    <p class="t-4 prose clip-6" id="about">${esc(ev.about)}</p>
    ${btn("More", { kind: "text", id: "more" })}

    <div class="s6">${head("Host", { open: true })}</div>
    ${row({
      lead: mark(ev.host, 2),
      title: esc(ev.host),
      sub: `${ev.hostEvents} events hosted`,
      trail: `<span class="btn btn--quiet btn--sm t-5 w-600" id="follow">${
        followsHost(ev.host) ? "Following" : "Follow"}</span>`,
      cls: "row--mark",
      href: `#/u/${encodeURIComponent(ev.host)}`,
    })}

    <div class="s6">${head(ev.minPrice === 0 ? "Entry" : "Tickets", { open: true })}</div>
    ${ev.tiers.map((t) => row({
      title: esc(t.name), sub: esc(t.desc),
      trail: `<span class="t-4 w-600">${money(t.price)}</span>`,
      href: null,
    })).join("")}
    <div class="s8"></div>
  </div>`;

  const dockLabel = going ? "View ticket"
    : ev.minPrice === 0 ? "RSVP · Free"
    : `Get tickets · from ${money(ev.minPrice)}`;

  return {
    html, tabs: false,
    bar: {
      /* No title in the bar: the page's own title is directly beneath it at
         40px, and printing the same words twice 60px apart is the thing this
         system set out to stop. */
      kind: "back", title: "",
      right: `<button class="bar-act" type="button" id="save" aria-pressed="${saved}"
        aria-label="Save event">${icon("bookmark", 24)}</button>`,
    },
    dock: btn(dockLabel, { kind: "primary", block: true, id: "go" }),
    mount(el) {
      /* The bookmark fills. There is no toast: the control that caused the
         action changes instead. */
      document.querySelector("#save")?.addEventListener("click", (e) => {
        const on = toggleSave(ev.id);
        haptic(6);
        e.currentTarget.setAttribute("aria-pressed", on);
      });

      el.querySelector("#follow")?.parentElement?.parentElement
        ?.addEventListener("click", (e) => {
          if (!e.target.closest("#follow")) return;
          e.preventDefault(); e.stopPropagation();
          const on = toggleHost(ev.host);
          haptic(6);
          e.target.textContent = on ? "Following" : "Follow";
        });

      el.querySelector("#more")?.addEventListener("click", (e) => {
        el.querySelector("#about").classList.remove("clip-6");
        e.currentTarget.remove();
      });

      document.querySelector("#go")?.addEventListener("click", () => {
        if (holds(ev.id)) { go(`#/pass/${state.myTickets.findIndex((t) => t.eventId === ev.id)}`); return; }
        if (needsSheet(ev)) { openTickets(ev); return; }
        commit(ev, 1);
      });
    },
  };
}

/* A commit writes the stub, flips the dock and adds a Going tag. No route
   change, no toast, no confirmation screen. */
function commit(ev, qty) {
  state.myTickets.unshift({
    eventId: ev.id, tier: state.tierIdx, qty, dayOffset: ev.dayOffset,
  });
  save(); success();
  refresh();
}

/* ------------------------------------------------------- the Tickets sheet */
export function openTickets(ev) {
  let qty = 1;
  const total = () => tierOf(ev).price * qty;

  const body = () => `
    <div class="sheet-t t-2">Tickets</div>
    ${ev.tiers.map((t, i) => row({
      title: esc(t.name), sub: esc(t.desc),
      trail: `<span class="t-4 w-600">${money(t.price)}</span>${rowTick()}`,
      attrs: `data-tier="${i}" aria-checked="${i === state.tierIdx}"`,
    })).join("")}

    <div class="s5">${row({
      title: "Tickets", kind: "destination",
      trail: `<span class="stepper">
        <button type="button" data-q="-1" aria-label="One fewer"${qty <= 1 ? " disabled" : ""}>−</button>
        <span>${qty}</span>
        <button type="button" data-q="1" aria-label="One more"${qty >= 10 ? " disabled" : ""}>+</button>
      </span>`,
    })}</div>

    <div class="s5">${row({
      title: `${esc(tierOf(ev).name)} × ${qty}`, kind: "destination",
      trail: `<span class="t-4 w-600">${money(total())}</span>`,
    })}</div>
    <div class="row" aria-hidden="true"></div>
    ${row({
      title: `<span class="t-3 w-600">Total</span>`, kind: "destination",
      trail: `<span class="t-3 w-600">${money(total())}</span>`,
    })}

    <div class="s5">${btn(`Pay ${money(total())}`, { kind: "primary", block: true, id: "pay" })}</div>`;

  sheet(body, {
    label: "Tickets",
    mount(el) {
      const repaint = () => { el.innerHTML = `<div class="grab"></div>${body()}`; };
      el.addEventListener("click", (e) => {
        const t = e.target.closest("[data-tier]");
        if (t) { haptic(6); state.tierIdx = +t.dataset.tier; save(); repaint(); return; }
        const q = e.target.closest("[data-q]");
        if (q) { haptic(6); qty = Math.max(1, Math.min(10, qty + +q.dataset.q)); repaint(); return; }
        if (e.target.closest("#pay")) { impact(); closeSheet(); commit(ev, qty); }
      });
    },
  });
}
