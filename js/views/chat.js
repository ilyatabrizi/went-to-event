/* Chat and one thread. Threads reply back, once, so the screen is not a dead
   end in a demo — and the reply says it is scripted. */

import { state, convos, convoOf, me, save, unreadNotifs, notifs } from "../store.js";
import { USERS } from "../data/people.js";
import { byId } from "../data/events.js";
import { esc } from "../util.js";
import { icon } from "../icons.js";
import { avatar, userName, empty, pageTitle, sectionHead, lazyImages } from "../parts.js";
import { sheet, closeSheet, toast } from "../ui.js";
import { go, refresh } from "../router.js";
import { haptic } from "../motion.js";

/* ------------------------------------------------------------------ list */
export default function chat() {
  const list = convos.filter((c) => !state.blocked[c.user]);

  const html = `
  <div class="wrap">
    ${pageTitle("Chat")}
    <div class="search" style="margin-top:18px">
      ${icon("search")}
      <input id="cq" type="search" placeholder="Search messages" aria-label="Search messages" autocomplete="off">
    </div>
  </div>

  <section class="section wrap">
    ${list.length ? `<div class="rows" id="clist">${list.map(convoRow).join("")}</div>`
      : empty("chat", "No messages", "Conversations with people you meet at events land here.")}
  </section>`;

  return {
    html,
    bar: { title: "Chat", right: `<button class="gbtn" type="button" id="compose"
      aria-label="New message">${icon("plus")}</button>` },
    mount(el) {
      lazyImages(el);
      const q = el.querySelector("#cq");
      q?.addEventListener("input", () => {
        const v = q.value.trim().toLowerCase();
        el.querySelectorAll("#clist [data-user]").forEach((row) => {
          const c = convoOf(row.dataset.user);
          const hay = `${USERS[c.user].name} ${c.msgs.map((m) => m.t).join(" ")}`.toLowerCase();
          row.hidden = !!v && !hay.includes(v);
        });
      });
      el.querySelector("#compose")?.addEventListener("click", openCompose);
    },
  };
}

function convoRow(c) {
  const last = c.msgs[c.msgs.length - 1];
  return `
  <a class="row-btn" href="#/thread/${c.user}" data-user="${c.user}">
    ${avatar(c.user, 46)}
    <span class="row-copy">
      <span class="spread"><span class="row-t">${userName(c.user)}</span>
        <span class="row-s" style="flex:none">${esc(c.ago)}</span></span>
      <span class="row-s clip">${last.f === "me" ? "You: " : ""}${esc(last.t)}</span>
    </span>
    ${c.unread ? `<span class="badge badge-solid" style="min-width:22px;justify-content:center">${c.unread}</span>` : ""}
  </a>`;
}

/* ---------------------------------------------------------------- thread */
export function thread({ key }) {
  const c = convoOf(key);
  if (!c) {
    return { html: `<div class="wrap">${empty("chat", "No such conversation", "It may have been deleted.",
      { href: "#/chat", label: "Back to Chat" })}</div>`, tabs: false, bar: { back: true, title: "Chat" } };
  }
  c.unread = 0;
  const u = USERS[key];

  const html = `
  <div class="wrap" style="padding-top:6px">
    <div style="display:grid;justify-items:center;text-align:center;gap:10px;padding:8px 0 26px">
      <a href="#/u/${key}">${avatar(key, 64)}</a>
      <div><div class="strong" style="font-size:16px">${userName(key)}</div>
        <div class="small">@${esc(u.handle)}</div></div>
    </div>

    <div class="stack" id="msgs" style="gap:9px">
      ${c.msgs.map(bubble).join("")}
    </div>
  </div>`;

  return {
    html, tabs: false,
    bar: { back: true, title: u.name },
    dock: `<div class="dock-row">
      <span class="search" style="flex:1;height:50px">
        <input id="msg" placeholder="Message ${esc(u.name.split(" ")[0])}" aria-label="Write a message"
          autocomplete="off"></span>
      <button class="gbtn" type="button" id="send" style="width:50px;height:50px;background:var(--act);color:var(--on-act);border-color:transparent"
        aria-label="Send">${icon("send")}</button>
    </div>`,
    mount(el) {
      const msgs = el.querySelector("#msgs");
      const input = document.querySelector("#msg");
      const send = document.querySelector("#send");
      scrollTo({ top: document.body.scrollHeight, behavior: "instant" });

      const push = (m) => {
        c.msgs.push(m);
        msgs.insertAdjacentHTML("beforeend", bubble(m));
        scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      };
      const submit = () => {
        const t = (input?.value || "").trim();
        if (!t) return;
        input.value = "";
        haptic(8);
        push({ f: "me", t, w: "now" });
        setTimeout(() => push({
          f: "them", w: "now",
          t: "(scripted reply — the preview answers once so the thread is not a dead end)",
        }), 900);
      };
      send?.addEventListener("click", submit);
      input?.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    },
  };
}

const bubble = (m) => `
  <div style="display:flex;justify-content:${m.f === "me" ? "flex-end" : "flex-start"}">
    <div style="max-width:78%;padding:11px 15px;border-radius:var(--r-lg);font-size:14.5px;line-height:1.45;
      ${m.f === "me" ? "background:var(--act);color:var(--on-act);border-bottom-right-radius:8px"
                     : "background:var(--wash);border-bottom-left-radius:8px"}">
      ${esc(m.t)}
      <div style="font-size:10.5px;opacity:.5;margin-top:4px;text-align:right">${esc(m.w)}</div>
    </div>
  </div>`;

function openCompose() {
  const people = Object.keys(USERS).filter((k) => k !== me && !state.blocked[k]);
  sheet(`
    <div class="sheet-t">New message</div>
    <div class="stack" style="gap:2px;padding-bottom:8px">
      ${people.map((k) => `
        <a class="row-btn" href="#/thread/${k}" data-close>
          ${avatar(k, 40)}
          <span class="row-copy"><span class="row-t" style="font-size:14.5px">${userName(k)}</span>
            <span class="row-s">@${esc(USERS[k].handle)}</span></span>
        </a>`).join("")}
    </div>`, { label: "New message" });
}

/* -------------------------------------------------------- notifications */
export function notifications() {
  const list = notifs;
  const html = `
  <div class="wrap">
    ${pageTitle("Notifications")}
    <section class="section">
      ${list.length ? `<div class="rows">${list.map(notifRow).join("")}</div>`
        : empty("bell", "Nothing yet", "Follows, replies and reminders land here.")}
    </section>
  </div>`;

  return {
    html, tabs: false,
    bar: { back: true, title: "Notifications", right:
      `<button class="gbtn" type="button" id="readall" aria-label="Mark all read">${icon("check")}</button>` },
    mount(el) {
      lazyImages(el);
      el.addEventListener("click", (e) => {
        const row = e.target.closest("[data-n]");
        if (row) notifs[+row.dataset.n].unread = false;
      });
      document.querySelector("#readall")?.addEventListener("click", () => {
        notifs.forEach((n) => { n.unread = false; });
        save(); toast("All caught up", "check"); refresh();
      });
    },
  };
}

function notifRow(n, i) {
  const href = !n.go ? "#/notifications"
    : n.go.to === "event" ? `#/event/${n.go.id}`
    : n.go.to === "user" ? `#/u/${n.go.key}`
    : n.go.to === "thread" ? `#/thread/${n.go.key}`
    : n.go.to === "premium" ? "#/membership" : "#/you";
  return `
  <a class="row-btn" href="${href}" data-n="${i}">
    <span class="ico" ${n.unread ? 'style="color:var(--ember)"' : ""}>${icon(n.ic)}</span>
    <span class="row-copy">
      <span class="row-t" style="font-size:14.5px;font-weight:${n.unread ? 600 : 500}">
        ${n.user ? `<b>${esc(USERS[n.user]?.name || n.user)}</b> ` : ""}${esc(n.text)}</span>
      <span class="row-s">${esc(n.ago)}</span>
    </span>
    ${n.unread ? '<i class="dot"></i>' : ""}
  </a>`;
}
