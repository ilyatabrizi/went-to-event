/* You, and anybody else. The same shape both times — a profile that changes
   layout depending on whose it is teaches you the app twice. */

import {
  state, save, me, allPosts, isMember, isFollowing, toggleFollow, ticketCount,
} from "../store.js";
import { USERS } from "../data/people.js";
import { byId, eventsForCity, nextId } from "../data/events.js";
import { esc, compact, plural } from "../util.js";
import { icon } from "../icons.js";
import { cityName, cityEvents } from "../place.js";
import {
  avatar, postCard, eventRow, empty, sectionHead, lazyImages, userName, memberTick,
} from "../parts.js";
import { segmented, sheet, closeSheet, toast } from "../ui.js";
import { go, refresh } from "../router.js";
import { haptic, commit } from "../motion.js";

/* --------------------------------------------------------------- you */
export default function profile() {
  const u = USERS[me];
  const mine = allPosts().filter((p) => p.author === me);
  const saved = state.saved.map(byId).filter(Boolean);
  const going = state.myTickets.filter((t) => !t.past).map((t) => byId(t.eventId)).filter(Boolean);

  const tab = state.profileTab;
  const list = tab === "posts" ? mine : tab === "saved" ? saved : going;

  const html = `
  <div class="wrap">
    <div class="row" style="gap:15px;padding-top:8px">
      ${avatar(me, 74)}
      <div class="row-copy">
        <div class="display d-3">${esc(u.name)}${state.member ? " " + memberTick(16) : ""}</div>
        <div class="small">@${esc(u.handle)}</div>
      </div>
    </div>
    <p class="lede" style="margin-top:14px;font-size:14.5px">${esc(u.bio)}</p>

    <div class="row" style="gap:22px;margin-top:16px">
      <span><b>${compact(u.followers)}</b> <span class="small">followers</span></span>
      <span><b>${compact(u.following)}</b> <span class="small">following</span></span>
    </div>

    <div class="dock-row" style="margin-top:18px">
      <a class="btn btn-primary" href="#/publish" style="flex:1">${icon("plus", 18)} Publish an event</a>
      <button class="btn btn-soft" type="button" id="post" style="flex:none;width:56px"
        aria-label="New post">${icon("send", 18)}</button>
    </div>

    ${!state.member ? `
      <a class="card card-pad row" href="#/membership" style="margin-top:14px">
        <span class="ico ico-lg">${icon("diamond")}</span>
        <span class="row-copy">
          <span class="row-t">Went Membership</span>
          <span class="row-s">No booking fees, members-only nights, early access.</span>
        </span>
        <span class="row-go">${icon("fwd")}</span>
      </a>` : `
      <div class="card card-pad row" style="margin-top:14px">
        <span class="ico ico-lg" style="color:var(--ink)">${icon("diamond")}</span>
        <span class="row-copy">
          <span class="row-t">Member since today</span>
          <span class="row-s">Booking fees are off. ${ticketCount()} upcoming.</span>
        </span>
      </div>`}

    <div style="margin-top:22px">
      ${segmented("profiletab", [
        { key: "posts", label: `Posts${mine.length ? " · " + mine.length : ""}` },
        { key: "saved", label: `Saved${saved.length ? " · " + saved.length : ""}` },
        { key: "going", label: `Going${going.length ? " · " + going.length : ""}` },
      ], tab)}
    </div>
  </div>

  <section class="section wrap">
    ${list.length
      ? (tab === "posts"
          ? `<div class="stack">${list.map(postCard).join("")}</div>`
          : `<div class="rows">${list.map((e) => eventRow(e)).join("")}</div>`)
      : empty(
          tab === "posts" ? "send" : tab === "saved" ? "bookmark" : "ticket",
          tab === "posts" ? "No posts yet" : tab === "saved" ? "Nothing saved" : "Nothing booked",
          tab === "posts" ? "Write about somewhere you went — it shows here and in your followers’ feeds."
          : tab === "saved" ? "Tap the bookmark on any event and it waits for you here."
          : "Book something and it appears here and in Went.",
          { href: "#/explore", label: "Find something" })}
  </section>`;

  return {
    html,
    bar: { title: "You", right:
      `<a class="gbtn" href="#/settings" aria-label="Settings">${icon("gear")}</a>` },
    mount(el) {
      lazyImages(el);
      el.querySelector("#post")?.addEventListener("click", openCompose);
    },
  };
}

/* ------------------------------------------------------- somebody else */
export function userProfile({ key }) {
  if (key === me) return profile();
  const u = USERS[key];
  if (!u) {
    return { html: `<div class="wrap">${empty("user", "No such person",
      "This profile is not in the preview.", { href: "#/chat", label: "Back" })}</div>`,
      tabs: false, bar: { back: true, title: "Profile" } };
  }
  const posts = allPosts().filter((p) => p.author === key);
  const hosting = cityEvents().filter((e) => (e.friends || []).includes(key)).slice(0, 4);
  const following = isFollowing(key);

  const html = `
  <div class="wrap">
    <div class="row" style="gap:15px;padding-top:8px">
      ${avatar(key, 74)}
      <div class="row-copy">
        <div class="display d-3">${esc(u.name)}${isMember(key) || u.member ? " " + memberTick(16) : ""}</div>
        <div class="small">@${esc(u.handle)}</div>
      </div>
    </div>
    <p class="lede" style="margin-top:14px;font-size:14.5px">${esc(u.bio)}</p>

    <div class="row" style="gap:22px;margin-top:16px">
      <span><b>${compact(u.followers)}</b> <span class="small">followers</span></span>
      <span><b>${compact(u.following)}</b> <span class="small">following</span></span>
    </div>

    <div class="dock-row" style="margin-top:18px">
      <button class="btn ${following ? "btn-soft" : "btn-primary"}" type="button" id="follow"
        aria-pressed="${following}" style="flex:1">${following ? "Following" : "Follow"}</button>
      <a class="btn btn-soft" href="#/thread/${key}" style="flex:none;width:56px"
        aria-label="Message">${icon("chat", 18)}</a>
      <button class="btn btn-soft" type="button" id="more" style="flex:none;width:56px"
        aria-label="More">${icon("more", 18)}</button>
    </div>
  </div>

  ${hosting.length ? `
    <section class="section wrap">
      ${sectionHead(`${esc(u.name.split(" ")[0])} is going to`)}
      <div class="rows">${hosting.map((e) => eventRow(e)).join("")}</div>
    </section>` : ""}

  <section class="section wrap">
    ${sectionHead("Posts")}
    ${posts.length ? `<div class="stack">${posts.map(postCard).join("")}</div>`
      : empty("send", "No posts", `${u.name.split(" ")[0]} has not written anything yet.`)}
  </section>`;

  return {
    html, tabs: false,
    bar: { back: true, title: u.name },
    mount(el) {
      lazyImages(el);
      el.querySelector("#follow")?.addEventListener("click", (e) => {
        const on = toggleFollow(key);
        haptic(8);
        const b = e.currentTarget;
        b.textContent = on ? "Following" : "Follow";
        b.className = `btn ${on ? "btn-soft" : "btn-primary"}`;
        b.setAttribute("aria-pressed", on);
      });
      el.querySelector("#more")?.addEventListener("click", () => {
        const muted = !!state.muted[key], blocked = !!state.blocked[key];
        sheet(`
          <div class="sheet-t">${esc(u.name)}</div>
          <div class="stack" style="gap:8px">
            <button class="row-btn" type="button" id="mute" style="background:var(--wash)">
              <span class="ico">${icon("mute")}</span>
              <span class="row-copy"><span class="row-t" style="font-size:14.5px">
                ${muted ? "Unmute" : "Mute"}</span>
                <span class="row-s">Their posts stop showing in your feed.</span></span></button>
            <button class="row-btn" type="button" id="block" style="background:var(--wash)">
              <span class="ico">${icon("shield")}</span>
              <span class="row-copy"><span class="row-t" style="font-size:14.5px;color:var(--ember-ink)">
                ${blocked ? "Unblock" : "Block"}</span>
                <span class="row-s">They can no longer message you.</span></span></button>
          </div>`, {
          label: "Options",
          mount(s) {
            s.querySelector("#mute").addEventListener("click", () => {
              if (state.muted[key]) delete state.muted[key]; else state.muted[key] = true;
              save(); closeSheet(); toast(state.muted[key] ? "Muted" : "Unmuted", "mute");
            });
            s.querySelector("#block").addEventListener("click", () => {
              if (state.blocked[key]) delete state.blocked[key]; else state.blocked[key] = true;
              save(); closeSheet(); commit();
              toast(state.blocked[key] ? "Blocked" : "Unblocked", "shield");
              if (state.blocked[key]) go("#/chat");
            });
          },
        });
      });
    },
  };
}

/* ---------------------------------------------------------- new post */
export function openCompose() {
  state.composeText = "";
  sheet(`
    <div class="sheet-t">New post</div>
    <div class="row" style="gap:11px;align-items:flex-start;margin-bottom:12px">
      ${avatar(me, 40)}
      <div class="field" style="flex:1">
        <textarea id="pt" rows="4" maxlength="280"
          placeholder="Where did you go? What was it like?" aria-label="Write a post"></textarea>
      </div>
    </div>
    <p class="tiny">Posts go to your profile and your followers’ feeds.</p>
    <div class="dock-row" style="padding-top:16px">
      <button class="btn btn-soft" type="button" data-close style="flex:none;width:104px">Cancel</button>
      <button class="btn btn-primary" type="button" id="send" style="flex:1" disabled>Post</button>
    </div>`, {
    label: "New post",
    mount(s) {
      const ta = s.querySelector("#pt"), send = s.querySelector("#send");
      ta.addEventListener("input", () => { send.disabled = !ta.value.trim(); });
      send.addEventListener("click", () => {
        const txt = ta.value.trim();
        if (!txt) return;
        state.posts.unshift({ id: "u" + nextId(), author: me, ago: "now", text: txt,
                              photo: null, likes: 0, replies: 0, eventId: null });
        state.profileTab = "posts";
        save(); closeSheet(); commit();
        toast("Posted", "checkcirc");
        go("#/you");
      });
      setTimeout(() => ta.focus(), 460);
    },
  });
}

/* ------------------------------------------------------------ membership */
const PERKS = [
  ["ticket", "No booking fees", "The $2.50 per ticket comes off, everywhere."],
  ["diamond", "Members-only nights", "Rooms that never go on general sale."],
  ["bolt", "Early access", "Tickets 24 hours before everyone else."],
  ["route", "City concierge", "A weekend plan built around what you actually like."],
];

export function membership() {
  const html = `
  <div class="wrap">
    <div style="display:grid;justify-items:center;text-align:center;gap:14px;padding:14px 0 8px">
      <span class="ico ico-lg" style="width:64px;height:64px;background:var(--wash)">
        ${icon("diamond", 26)}</span>
      <h1 class="display d-2">Went Membership</h1>
      <p class="title-sub" style="text-align:center;margin:0 auto">
        ${state.member ? "You are a member. Fees are off and the members rooms are open."
                       : "For people who go out more than twice a month."}</p>
    </div>

    <section class="section">
      <div class="rows">
        ${PERKS.map(([ic, t, s]) => `
          <div class="row-btn">
            <span class="ico">${icon(ic)}</span>
            <span class="row-copy"><span class="row-t">${t}</span><span class="row-s">${s}</span></span>
          </div>`).join("")}
      </div>
    </section>

    <section class="section">
      <div class="card card-pad spread">
        <span class="row-copy">
          <span class="row-t">Monthly</span>
          <span class="row-s">Cancel any time</span>
        </span>
        <span class="display d-3">$9<span class="small">/mo</span></span>
      </div>
    </section>

    <section class="section">
      <p class="tiny" style="text-align:center">Billing is stubbed in this preview —
        subscribing here changes the app, not your card.</p>
    </section>
  </div>`;

  return {
    html, tabs: false,
    bar: { back: true, title: "Membership" },
    dock: state.member
      ? `<button class="btn btn-soft" type="button" id="cancel">Cancel membership</button>`
      : `<button class="btn btn-primary" type="button" id="join">Become a member · $9/mo</button>`,
    mount() {
      document.querySelector("#join")?.addEventListener("click", () => {
        state.member = true; save(); commit();
        toast("You are a member", "diamond"); go("#/you");
      });
      document.querySelector("#cancel")?.addEventListener("click", () => {
        state.member = false; save();
        toast("Membership cancelled", "info"); go("#/you");
      });
    },
  };
}
