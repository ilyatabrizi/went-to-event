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
    <div class="search" style="margin-top:16px">
      ${icon("search")}
      <input id="cq" type="search" placeholder="Search" aria-label="Search messages" autocomplete="off">
    </div>
  </div>

  <section class="section">
    ${list.length ? `<div class="chat-list" id="clist">${list.map(convoRow).join("")}</div>`
      : empty("chat", "No messages", "Conversations with people you meet at events land here.")}
    <p class="chat-note" id="cnone" hidden>No conversations match that.</p>
  </section>`;

  return {
    html,
    bar: { title: "Chat", right: `<button class="gbtn" type="button" id="compose"
      aria-label="New message">${icon("plus")}</button>` },
    mount(el) {
      lazyImages(el);
      const q = el.querySelector("#cq");
      const none = el.querySelector("#cnone");
      q?.addEventListener("input", () => {
        const v = q.value.trim().toLowerCase();
        let shown = 0;
        el.querySelectorAll("#clist [data-user]").forEach((row) => {
          const c = convoOf(row.dataset.user);
          const hay = `${USERS[c.user].name} ${c.msgs.map((m) => m.t).join(" ")}`.toLowerCase();
          const hit = !v || hay.includes(v);
          row.hidden = !hit;
          if (hit) shown++;
        });
        none.hidden = shown > 0;
      });
      el.querySelector("#compose")?.addEventListener("click", openCompose);
    },
  };
}

/* One row, the way iOS builds one: the avatar sets the inset, the hairline
   starts where the text does, and an unread is a dot rather than a number —
   the count is not the point, the fact that you have not read it is. */
function convoRow(c) {
  const last = c.msgs[c.msgs.length - 1];
  return `
  <a class="chat-row" href="#/thread/${c.user}" data-user="${c.user}">
    <span class="chat-dot${c.unread ? " on" : ""}" aria-hidden="true"></span>
    ${avatar(c.user, 52)}
    <span class="chat-body">
      <span class="chat-top">
        <span class="chat-name">${userName(c.user)}</span>
        <span class="chat-when">${esc(c.ago)}${icon("fwd", 14, "chat-chev")}</span>
      </span>
      <span class="chat-prev">${last.f === "me" ? "You: " : ""}${esc(last.t)}</span>
    </span>
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
  <div class="wrap" style="padding-top:4px">
    <a class="thread-head" href="#/u/${key}">
      ${avatar(key, 62)}
      <span class="thread-name">${userName(key)}</span>
      <span class="thread-handle">@${esc(u.handle)} ${icon("fwd", 13)}</span>
    </a>

    <div class="bubbles" id="msgs">${render(c.msgs)}</div>
  </div>`;

  return {
    html, tabs: false,
    bar: { back: true, title: u.name },
    dock: `<div class="composer">
      <input id="msg" placeholder="Message" aria-label="Write a message" autocomplete="off">
      <button class="send" type="button" id="send" aria-label="Send" disabled>${icon("up", 19)}</button>
    </div>`,
    mount(el) {
      const msgs = el.querySelector("#msgs");
      const input = document.querySelector("#msg");
      const send = document.querySelector("#send");
      const bottom = () => scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
      bottom();

      input?.addEventListener("input", () => { send.disabled = !input.value.trim(); });

      const submit = () => {
        const t = (input?.value || "").trim();
        if (!t) return;
        input.value = ""; send.disabled = true;
        haptic(8);
        c.msgs.push({ f: "me", t, w: "now" });
        msgs.innerHTML = render(c.msgs);
        scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        setTimeout(() => {
          msgs.insertAdjacentHTML("beforeend", `<div class="typing" id="typing">
            <span></span><span></span><span></span></div>`);
          scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        }, 420);
        setTimeout(() => {
          c.msgs.push({ f: "them", w: "now",
            t: "(a scripted reply — the preview answers once so the thread is not a dead end)" });
          msgs.innerHTML = render(c.msgs);
          scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        }, 1500);
      };
      send?.addEventListener("click", submit);
      input?.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    },
  };
}

/* Consecutive messages from one person are one block: only the last of a run
   carries the tail and the time, and the gap inside a run is a third of the gap
   between them. That grouping is most of what makes a thread read as a
   conversation rather than a list of rows. */
function render(msgs) {
  return msgs.map((m, i) => {
    const prev = msgs[i - 1], next = msgs[i + 1];
    const runStart = !prev || prev.f !== m.f;
    const runEnd = !next || next.f !== m.f;
    const cls = [
      "bub", m.f === "me" ? "mine" : "theirs",
      runStart ? "start" : "", runEnd ? "end" : "",
    ].filter(Boolean).join(" ");
    return `<div class="${cls}">
      <span class="bub-t">${esc(m.t)}</span>
      ${runEnd ? `<span class="bub-w">${esc(m.w)}</span>` : ""}
    </div>`;
  }).join("");
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
    <span class="ico" ${n.unread ? 'style="color:var(--ink)"' : ""}>${icon(n.ic)}</span>
    <span class="row-copy">
      <span class="row-t" style="font-size:14.5px;font-weight:${n.unread ? 600 : 500}">
        ${n.user ? `<b>${esc(USERS[n.user]?.name || n.user)}</b> ` : ""}${esc(n.text)}</span>
      <span class="row-s">${esc(n.ago)}</span>
    </span>
    ${n.unread ? '<i class="dot"></i>' : ""}
  </a>`;
}
