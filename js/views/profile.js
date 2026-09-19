/* YOU, SAVED and HOST.
 *
 * Three screens, zero CSS between them — which is the test of the system. You
 * is a Mark, a Button and lists of Entries; Saved is a list of Entries; Host is
 * a Mark, a Button and a list of Entries.
 *
 * Gone from You: the Going tab (byte-for-byte the same filter as Went's
 * Upcoming, and its own empty-state copy admitted it), the segmented control
 * and its count suffixes, the membership upsell, the member tick, the
 * verification row, and ten settings sub-routes. Two controls survive the
 * audit — Haptics, the one settings flag any code reads, and Reset. */

import { state, save, reset, me, myEvents } from "../store.js";
import { USERS } from "../data/people.js";
import { byId } from "../data/events.js";
import { esc } from "../util.js";
import { icon } from "../icons.js";
import { cityName, cityEvents } from "../place.js";
import { entry, head, row, mark, btn, empty, tag } from "../parts.js";
import { followsHost, toggleHost } from "../store.js";
import { refresh } from "../router.js";
import { haptic, warn } from "../motion.js";

/* ------------------------------------------------------------------- YOU */
export default function profile() {
  const u = USERS[me];
  const saved = state.saved.map(byId).filter(Boolean);
  const mine = myEvents();

  const html = `
  <div class="wrap center s5">
    ${mark(me, 4)}
    <div class="t-2 s4">${esc(u.name)}</div>
    <div class="t-5 c-ash s1">@${esc(u.handle)} · ${esc(cityName())}</div>
  </div>

  <div class="wrap s5">
    ${btn("Publish an event", { kind: "primary", block: true, href: "#/publish" })}

    ${mine.length ? `
      <div class="s7">${head("Your events", { open: true })}</div>
      ${mine.map((e) => entry(e, { tag: "" })).join("")}` : ""}

    <div class="s7">${head(`Saved${saved.length ? ` · ${saved.length}` : ""}`, { open: true })}</div>
    ${saved.length
      ? saved.slice(0, 3).map((e) => entry(e)).join("") +
        (saved.length > 3 ? btn(`See all ${saved.length}`, { kind: "text", href: "#/saved" }) : "")
      : `<p class="t-5 c-ash">Tap the bookmark on an event and it lands here.</p>`}

    <div class="s7">${head("This preview", { open: true })}</div>
    ${row({
      title: "Haptics", kind: "destination",
      trail: `<span class="switch" role="switch" id="hap"
        aria-pressed="${state.haptics}" aria-label="Haptics"><i></i></span>`,
    })}
    ${row({ title: `<span class="c-ember">Reset this preview</span>`, kind: "destination",
            attrs: 'id="reset"' })}

    <p class="t-6 c-ash s6">Every event, host and person here is invented.</p>
    <p class="t-6 c-ash">Went To Event · Build 2026.09 · Alpha Agency</p>
    <div class="s8"></div>
  </div>`;

  return {
    html,
    bar: { kind: "title", title: "You" },
    mount(el) {
      el.querySelector("#hap")?.addEventListener("click", (e) => {
        state.haptics = !state.haptics;
        save();
        e.currentTarget.setAttribute("aria-pressed", state.haptics);
        haptic(6);
      });
      el.querySelector("#reset")?.addEventListener("click", () => { warn(); reset(); });
    },
  };
}

/* ----------------------------------------------------------------- SAVED */
export function saved() {
  const list = state.saved.map(byId).filter(Boolean);
  const html = `
  <div class="wrap s5">
    ${list.length
      ? list.map((e) => entry(e)).join("")
      : empty("bookmark", "Nothing saved yet",
          "Tap the bookmark on an event and it lands here.",
          { href: "#/", label: "Find something" })}
    <div class="s8"></div>
  </div>`;
  return { html, tabs: false, bar: { kind: "back", title: "Saved" } };
}

/* ------------------------------------------------------------------ HOST */
export function host({ key }) {
  const name = decodeURIComponent(key);
  const theirs = cityEvents().filter((e) => e.host === name);
  const following = followsHost(name);

  const html = `
  <div class="wrap center s5">
    ${mark(name, 3)}
    <div class="t-2 s4">${esc(name)}</div>
    <div class="t-5 c-ash s1">${theirs.length} ${theirs.length === 1 ? "event" : "events"} on now</div>
  </div>
  <div class="wrap s5">
    ${btn(following ? "Following" : "Follow", { kind: "quiet", block: true, id: "f" })}
    ${theirs.length ? `
      <div class="s7">${head("Their events", { open: true })}</div>
      ${theirs.map((e) => entry(e)).join("")}` : ""}
    <div class="s8"></div>
  </div>`;

  return {
    html, tabs: false, bar: { kind: "back", title: name },
    mount(el) {
      el.querySelector("#f")?.addEventListener("click", (e) => {
        const on = toggleHost(name);
        haptic(6);
        e.currentTarget.textContent = on ? "Following" : "Follow";
      });
    },
  };
}
