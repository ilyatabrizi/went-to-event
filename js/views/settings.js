/* Settings, as a shallow tree. One route per page, so the back button behaves
   and a deep page can be linked to directly. */

import { state, save, reset, me, notifs } from "../store.js";
import { USERS } from "../data/people.js";
import { esc } from "../util.js";
import { icon } from "../icons.js";
import { avatar, empty, pageTitle, sectionHead, brandMark } from "../parts.js";
import { sheet, closeSheet, toast } from "../ui.js";
import { canInstall, installed, promptInstall } from "../install.js";
import { go, refresh } from "../router.js";
import { haptic, warn } from "../motion.js";

const TITLES = {
  root: "Settings", account: "Account", notifications: "Notifications", privacy: "Privacy",
  blocked: "Blocked", muted: "Muted", payment: "Payment", appearance: "Appearance",
  help: "Help", legal: "Legal", about: "About",
};

/* A named group. Nine identical rows with no headings is a list nobody can
   navigate twice; the name is what makes it findable. */
const group = (label, rows, note) => `
  <section class="section wrap">
    ${label ? `<span class="label rows-label">${esc(label)}</span>` : ""}
    <div class="rows">${rows}</div>
    ${note ? `<span class="rows-note">${esc(note)}</span>` : ""}
  </section>`;

const link = (key, ic, title, sub) => `
  <a class="row-btn" href="${key.startsWith("#") ? key : "#/settings/" + key}">
    <span class="ico">${icon(ic)}</span>
    <span class="row-copy"><span class="row-t">${title}</span>
      ${sub ? `<span class="row-s">${sub}</span>` : ""}</span>
    <span class="row-go">${icon("fwd")}</span>
  </a>`;

const toggle = (ic, title, sub, on, attrs) => `
  <div class="row-btn">
    <span class="ico">${icon(ic)}</span>
    <span class="row-copy"><span class="row-t">${title}</span>
      ${sub ? `<span class="row-s">${sub}</span>` : ""}</span>
    <button class="switch" type="button" role="switch" aria-checked="${!!on}"
      aria-label="${title}" ${attrs}></button>
  </div>`;

export default function settings({ key = "root" } = {}) {
  const k = key || "root";
  const body = PAGES[k] ? PAGES[k]() : `<div class="wrap">${empty("gear", "Not here",
    "That settings page does not exist.", { href: "#/settings", label: "Back to Settings" })}</div>`;

  return {
    html: body, tabs: k === "root",
    bar: k === "root" ? { back: true, title: "Settings" } : { back: true, title: TITLES[k] || "Settings" },
    mount(el) {
      el.addEventListener("click", (e) => {
        const sw = e.target.closest("[data-toggle]");
        if (sw) {
          haptic(6);
          const [group, name] = sw.dataset.toggle.split(".");
          if (group === "notif") state.notif[name] = !state.notif[name];
          else state[name] = !state[name];
          save();
          sw.setAttribute("aria-checked", group === "notif" ? state.notif[name] : state[name]);
          return;
        }
        if (e.target.closest("#install")) { promptInstall(); return; }
        if (e.target.closest("#reset")) {
          sheet(`
            <div class="sheet-t">Reset this preview</div>
            <p class="lede">This clears your saved events, tickets, posts and settings, and puts
              the demo back to how it arrived. It cannot be undone.</p>
            <div class="dock-row" style="padding-top:20px">
              <button class="btn btn-soft" type="button" data-close style="flex:1">Keep it</button>
              <button class="btn btn-danger" type="button" id="doReset" style="flex:1">Reset</button>
            </div>`, {
            label: "Reset",
            mount(s) { s.querySelector("#doReset").addEventListener("click", () => { warn(); reset(); }); },
          });
        }
      });
    },
  };
}

const PAGES = {
  root: () => {
    const u = USERS[me];
    return `
    <div class="wrap">
      ${pageTitle("Settings")}
      <a class="card card-pad row" href="#/you" style="margin-top:20px">
        ${avatar(me, 52)}
        <span class="row-copy">
          <span class="row-t">${esc(u.name)}</span>
          <span class="row-s">@${esc(u.handle)}${state.member ? " · Member" : ""}</span>
        </span>
        <span class="row-go">${icon("fwd")}</span>
      </a>
    </div>

    ${group("Your account",
      link("account", "user", "Account", "Name, handle, bio") +
      link("#/verify", "shield", "Verification",
           state.verified ? "Verified · your badge is live" : "Get the badge hosts look for") +
      link("privacy", "lock", "Privacy", "Who sees you and what you do"))}

    ${group("App",
      link("notifications", "bell", "Notifications", "What reaches your phone") +
      link("payment", "card", "Payment", "Cards and the Went balance") +
      link("appearance", "eye", "Appearance", "Motion, haptics, contrast"))}

    ${group("About",
      link("help", "info", "Help", "How this preview works") +
      link("legal", "shield", "Legal", "Terms and privacy") +
      link("about", "globe", "About", "What this build is"))}

    ${!installed() && canInstall() ? `
      <section class="section wrap">
        <button class="card card-pad row" type="button" id="install" style="width:100%;text-align:left">
          <span class="ico">${icon("plus")}</span>
          <span class="row-copy"><span class="row-t">Add to home screen</span>
            <span class="row-s">Opens full screen, works offline</span></span>
          <span class="row-go">${icon("fwd")}</span>
        </button>
      </section>` : ""}

    <section class="section wrap">
      <button class="btn btn-danger" type="button" id="reset">Reset this preview</button>
    </section>

    <footer style="text-align:center;padding:34px 0 8px;opacity:.4">
      <div style="display:flex;justify-content:center;margin-bottom:9px;color:var(--mute)">${brandMark(24)}</div>
      <div class="label">Went To Event · preview build</div>
    </footer>`;
  },

  account: () => `
    <div class="wrap">
      ${pageTitle("Account")}
      <section class="section">
        <div class="stack" style="gap:16px">
          <div class="field"><label>Name</label><input value="${esc(USERS[me].name)}" readonly></div>
          <div class="field"><label>Handle</label><input value="@${esc(USERS[me].handle)}" readonly></div>
          <div class="field"><label>Bio</label><textarea rows="3" readonly>${esc(USERS[me].bio)}</textarea></div>
        </div>
        <p class="tiny" style="padding-top:14px">Editing a profile is stubbed — there is no account
          behind this preview, so nothing here saves.</p>
      </section>
      <section class="section"><div class="rows">
        ${toggle("lock", "Private account", "Only approved followers see your posts",
          state.privateAcct, 'data-toggle="s.privateAcct"')}
      </div></section>
    </div>`,

  notifications: () => `
    <div class="wrap">${pageTitle("Notifications")}</div>
    ${group("Events",
      toggle("bell", "Starting soon", "Three hours before doors",
        state.notif.starting, 'data-toggle="notif.starting"') +
      toggle("users", "Friends going", "When someone you follow joins",
        state.notif.friends, 'data-toggle="notif.friends"') +
      toggle("sparkle", "New from hosts you follow", "Only the ones you follow",
        state.notif.hosts, 'data-toggle="notif.hosts"'))}
    ${group("People",
      toggle("chat", "Messages", "Every new message",
        state.notif.messages, 'data-toggle="notif.messages"') +
      toggle("diamond", "Members-only drops", "Rooms that never reach general sale",
        state.notif.drops, 'data-toggle="notif.drops"'),
      "Push is stubbed in this preview. Nothing is scheduled and no permission is requested.")}`,

  privacy: () => `
    <div class="wrap">
      ${pageTitle("Privacy")}
      <section class="section"><div class="rows">
        ${toggle("lock", "Private account", "Only approved followers see your posts",
          state.privateAcct, 'data-toggle="s.privateAcct"')}
        ${toggle("eye", "Show me on events I join", "Friends can see you are going",
          state.sound, 'data-toggle="s.sound"')}
      </div></section>
      <section class="section"><div class="rows">
        ${link("blocked", "shield", "Blocked", `${Object.keys(state.blocked).length} people`)}
        ${link("muted", "mute", "Muted", `${Object.keys(state.muted).length} people`)}
      </div></section>
    </div>`,

  blocked: () => peopleList("blocked", "No one is blocked",
    "Block someone from their profile and they show up here."),
  muted: () => peopleList("muted", "No one is muted",
    "Mute someone from their profile and their posts stop appearing in your feed."),

  payment: () => `
    <div class="wrap">
      ${pageTitle("Payment")}
      <section class="section"><div class="rows">
        <div class="row-btn"><span class="ico">${icon("apple")}</span>
          <span class="row-copy"><span class="row-t">Apple Pay</span>
            <span class="row-s">Default</span></span></div>
        <div class="row-btn"><span class="ico">${icon("card")}</span>
          <span class="row-copy"><span class="row-t">Visa · 4242</span>
            <span class="row-s">Expires 09/29</span></span></div>
        <div class="row-btn"><span class="ico">${icon("wallet")}</span>
          <span class="row-copy"><span class="row-t">Went balance</span>
            <span class="row-s">$40.00</span></span></div>
      </div></section>
      <section class="section">
        <p class="tiny">Every card here is invented. No payment processor is contacted anywhere
          in this preview.</p>
      </section>
    </div>`,

  appearance: () => `
    <div class="wrap">
      ${pageTitle("Appearance")}
      <section class="section"><div class="rows">
        ${toggle("wave", "Haptics", "A short tap on meaningful actions",
          state.haptics, 'data-toggle="s.haptics"')}
      </div></section>
      <section class="section">
        <div class="card card-pad stack" style="gap:12px">
          <div class="row-t">Following your system</div>
          <p class="small">Reduced motion, reduced transparency and increased contrast are all
            read from your device settings and honoured — there is nothing to switch on here.</p>
        </div>
      </section>
    </div>`,

  help: () => `
    <div class="wrap">
      ${pageTitle("Help")}
      <section class="section">
        <div class="rows">
          ${[["search", "Finding events", "Explore searches titles, hosts, venues and descriptions in the city you are in."],
             ["ticket", "Booking", "Pick a tier, choose how many, pay. The pass lands in Went."],
             ["plus", "Publishing", "Four steps, and you can see the card being built as you type."],
             ["pin", "Changing city", "Tap the city name in the bar. Every city has a full catalogue."]]
            .map(([ic, t, s]) => `
              <div class="row-btn"><span class="ico">${icon(ic)}</span>
                <span class="row-copy"><span class="row-t">${t}</span>
                  <span class="row-s">${s}</span></span></div>`).join("")}
        </div>
      </section>
    </div>`,

  legal: () => `
    <div class="wrap">
      ${pageTitle("Legal")}
      <section class="section">
        <div class="card card-pad stack" style="gap:14px">
          <div>
            <div class="row-t">Terms</div>
            <p class="small" style="margin-top:5px">There are none. This is a design preview built
              by Alpha Agency, not a running service, and no agreement is formed by using it.</p>
          </div>
          <div>
            <div class="row-t">Privacy</div>
            <p class="small" style="margin-top:5px">Nothing you do here leaves your device. There is
              no account, no server and no analytics; state lives in this browser’s local storage
              and Reset clears it.</p>
          </div>
        </div>
      </section>
    </div>`,

  about: () => `
    <div class="wrap">
      ${pageTitle("About")}
      <section class="section">
        <div style="display:grid;justify-items:center;text-align:center;gap:14px;padding:8px 0 4px">
          <span style="color:var(--ink)">${brandMark(54)}</span>
          <div>
            <div class="display d-3">Went To Event</div>
            <p class="small" style="margin-top:6px;max-width:30ch">
              What is on near you, and who is going. Join in two taps, or publish your own
              in four steps.</p>
          </div>
        </div>
      </section>
      <section class="section"><div class="rows">
        <div class="row-btn"><span class="row-copy"><span class="row-t">Build</span>
          <span class="row-s">Preview · design system v2</span></span></div>
        <div class="row-btn"><span class="row-copy"><span class="row-t">Made by</span>
          <span class="row-s">Alpha Agency, Dubai</span></span></div>
      </div></section>
    </div>`,
};

function peopleList(which, emptyTitle, emptySub) {
  const keys = Object.keys(state[which]);
  return `
  <div class="wrap">
    ${pageTitle(TITLES[which])}
    <section class="section">
      ${keys.length ? `<div class="rows">${keys.map((k) => `
        <div class="row-btn">
          ${avatar(k, 42)}
          <span class="row-copy"><span class="row-t">${esc(USERS[k]?.name || k)}</span>
            <span class="row-s">@${esc(USERS[k]?.handle || k)}</span></span>
          <a class="btn btn-soft btn-sm" href="#/u/${k}">View</a>
        </div>`).join("")}</div>`
      : empty("users", emptyTitle, emptySub)}
    </section>
  </div>`;
}

export { TITLES as SETTINGS_TITLES };
