/* One event, in full. The cover runs under the bar; everything below it answers
   a question somebody actually asks before deciding to go. */

import { state, save, isSaved, toggleSave, followsHost, toggleHost, isMember } from "../store.js";
import { byId, eventsForCity } from "../data/events.js";
import { USERS } from "../data/people.js";
import { esc, money, compact, plural } from "../util.js";
import { icon, iconFill } from "../icons.js";
import { cityName } from "../place.js";
import {
  cover, avatar, sectionHead, eventRow, railCard, lazyImages, userName, note,
} from "../parts.js";
import { sheet, closeSheet, toast } from "../ui.js";
import { go, refresh } from "../router.js";
import { haptic, commit } from "../motion.js";

/* A schematic, not a map. An invented street grid that claims to be real is
   worse than an honest abstraction — this one says "roughly here" and stops. */
function miniMap(ev) {
  const seed = ev.id;
  const lines = [];
  for (let i = 1; i < 7; i++) {
    lines.push(`<path d="M0 ${i * 26 + (seed % 9)} H320" stroke="rgba(138,132,143,.14)" stroke-width="1"/>`);
    lines.push(`<path d="M${i * 46 + (seed % 13)} 0 V172" stroke="rgba(138,132,143,.14)" stroke-width="1"/>`);
  }
  return `<div class="map">
    <svg viewBox="0 0 320 172" preserveAspectRatio="none">
      ${lines.join("")}
      <path d="M0 96 C 80 86, 150 120, 320 78" stroke="rgba(138,132,143,.22)" stroke-width="7" fill="none"/>
    </svg>
    <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;place-items:center">
      <span style="position:absolute;width:70px;height:70px;border-radius:50%;
        background:radial-gradient(circle,rgba(244,241,236,.18),transparent 70%)"></span>
      <span style="width:14px;height:14px;border-radius:50%;background:var(--act);
        box-shadow:0 0 0 4px rgba(244,241,236,.16),0 4px 14px rgba(0,0,0,.6)"></span>
    </span>
  </div>`;
}

export default function detail({ id }) {
  const ev = byId(+id);
  state.eventId = ev.id;
  const friends = (ev.friends || []).filter((k) => USERS[k] && !state.blocked[k]);
  const others = Math.max(0, ev.going - friends.length);
  const all = eventsForCity(cityName());
  const fromHost = all.filter((e) => e.host === ev.host && e.id !== ev.id).slice(0, 4);
  const similar = all.filter((e) => e.cat === ev.cat && e.id !== ev.id).slice(0, 4);
  const locked = ev.member && !state.member;

  const html = `
  <div class="hero" style="min-height:clamp(360px,58svh,470px)">
    <span class="cover">${cover(ev, { tall: true })}</span>
    <span class="hero-body">
      <span class="hero-meta">
        ${ev.soon ? `<span class="live"><i class="dot"></i>Tonight</span>` : ""}
        <span class="badge">${esc(ev.catLabel || ev.cat)}</span>
        ${locked ? `<span class="badge badge-solid">Members only</span>` : ""}
      </span>
      <span class="hero-title">${esc(ev.title)}</span>
    </span>
  </div>

  <div class="wrap" style="padding-top:20px">
    <!-- when + where -->
    <div class="card card-pad stack" style="gap:14px">
      <div class="row">
        <span class="ico">${icon("cal")}</span>
        <span class="row-copy">
          <span class="row-t">${esc(ev.dateLong)}</span>
          <span class="row-s">${esc(ev.timeRange)}</span>
        </span>
      </div>
      <div class="row">
        <span class="ico">${icon("pin")}</span>
        <span class="row-copy">
          <span class="row-t">${esc(ev.venue)}</span>
          <span class="row-s">${esc(ev.address)} · ${ev.dist} km away</span>
        </span>
      </div>
      ${miniMap(ev)}
    </div>

    <!-- host -->
    <section class="section">
      ${sectionHead("Hosted by")}
      <div class="card card-pad row">
        <span class="ico ico-lg">${icon("users")}</span>
        <span class="row-copy">
          <span class="row-t">${esc(ev.host)}</span>
          <span class="row-s">${ev.hostEvents} events hosted</span>
        </span>
        <button class="btn ${followsHost(ev.host) ? "btn-soft" : "btn-primary"} btn-sm"
          type="button" id="followHost" aria-pressed="${followsHost(ev.host)}">
          ${followsHost(ev.host) ? "Following" : "Follow"}</button>
      </div>
    </section>

    <!-- who is going -->
    <section class="section">
      ${sectionHead("Who is going")}
      ${friends.length ? `
        <div class="rail" style="padding-inline:0;margin-inline:0">
          ${friends.map((k) => `
            <a href="#/u/${k}" style="width:66px;text-align:center;flex:none">
              ${avatar(k, 54)}
              <span class="row-s clip" style="display:block;margin-top:7px;font-size:11.5px">
                ${esc(USERS[k].name.split(" ")[0])}</span>
            </a>`).join("")}
          <span style="width:66px;text-align:center;flex:none">
            <span class="av" style="width:54px;height:54px;background:var(--wash);color:var(--mute);font-size:13px">
              +${compact(others)}</span>
            <span class="row-s" style="display:block;margin-top:7px;font-size:11.5px">others</span>
          </span>
        </div>`
      : `<p class="lede">${compact(ev.going)} ${plural(ev.going, "person is", "people are")} going.
           None of your friends yet — you would be the first.</p>`}
    </section>

    <!-- about -->
    <section class="section">
      ${sectionHead("About")}
      <p class="lede">${esc(ev.about)}</p>
    </section>

    <!-- tiers -->
    <section class="section">
      ${sectionHead(ev.minPrice === 0 ? "Entry" : "Tickets")}
      <div class="rows">
        ${ev.tiers.map((t) => `
          <div class="row-btn">
            <span class="row-copy">
              <span class="row-t">${esc(t.name)}</span>
              <span class="row-s">${esc(t.desc)}</span>
            </span>
            <span class="strong money">${money(t.price)}</span>
          </div>`).join("")}
      </div>
      ${locked ? note("This one is members only. Membership also drops the booking fee on everything else.") : ""}
    </section>

    ${fromHost.length ? `
      <section class="section">
        ${sectionHead(`More from ${ev.host}`)}
        <div class="rows">${fromHost.map((e) => eventRow(e)).join("")}</div>
      </section>` : ""}

    ${similar.length ? `
      <section class="section">
        ${sectionHead("Similar events")}
      </section>` : ""}
  </div>
  ${similar.length ? `<div class="rail">${similar.map(railCard).join("")}</div>` : ""}

  <div class="wrap" style="padding-top:30px">
    <button class="btn btn-quiet" type="button" id="report">${icon("flag", 16)} Report this event</button>
  </div>`;

  const dock = locked
    ? `<button class="btn btn-primary" type="button" data-go="#/membership">
         ${icon("diamond", 18)} Unlock with membership</button>`
    : `<div class="dock-row">
         <button class="btn btn-soft" type="button" id="save" style="flex:none;width:56px"
           aria-pressed="${isSaved(ev.id)}" aria-label="Save event">${iconFill("bookmark", 19)}</button>
         <button class="btn btn-primary" type="button" data-go="#/book/${ev.id}" style="flex:1">
           ${ev.minPrice === 0 ? "RSVP · Free" : `Get tickets · from ${money(ev.minPrice)}`}</button>
       </div>`;

  return {
    html, dock, tabs: false, bar: { back: true, title: ev.title },
    mount(el) {
      document.getElementById("shell").dataset.hero = "1";
      lazyImages(el);

      el.querySelector("#followHost")?.addEventListener("click", (e) => {
        const on = toggleHost(ev.host);
        haptic(8);
        e.currentTarget.textContent = on ? "Following" : "Follow";
        e.currentTarget.className = `btn ${on ? "btn-soft" : "btn-primary"} btn-sm`;
        e.currentTarget.setAttribute("aria-pressed", on);
        toast(on ? `Following ${ev.host}` : `Unfollowed ${ev.host}`, on ? "check" : "close");
      });

      el.querySelector("#report")?.addEventListener("click", () => {
        sheet(`
          <div class="sheet-t">Report this event</div>
          <div class="stack" style="gap:8px">
            ${["Misleading information", "It is not happening", "Inappropriate content",
               "Spam or a scam", "Something else"].map((r) => `
              <button class="row-btn" type="button" data-r style="background:var(--wash)">
                <span class="row-copy"><span class="row-t" style="font-size:14.5px">${r}</span></span>
                <span class="row-go">${icon("fwd")}</span></button>`).join("")}
          </div>
          <p class="tiny" style="padding-top:16px">Reporting is stubbed in this preview —
            nothing is sent anywhere.</p>`, {
          label: "Report",
          mount(s) {
            s.addEventListener("click", (e) => {
              if (!e.target.closest("[data-r]")) return;
              closeSheet(); commit(); toast("Thanks — we will take a look", "shield");
            });
          },
        });
      });
    },
  };
}
