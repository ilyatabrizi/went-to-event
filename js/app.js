/* Wiring. Routes, the two bars, the dock, and the handful of things that have
   to stay in step with state no matter which view is on screen. */

import { $ } from "./util.js";
import { icon } from "./icons.js";
import { route, startRouter, go, render } from "./router.js";
import { state, save, subscribe, unreadChats, unreadNotifs, toggleSave, isSaved } from "./store.js";
import { iconFill } from "./icons.js";
import { barPlace, barBack, barRoot, lazyImages } from "./parts.js";
import { GRAIN_DEFS } from "./artwork.js";
import { cityName } from "./place.js";
import { toast, closeSheet } from "./ui.js";
import { haptic } from "./motion.js";
import { openCityPicker } from "./views/pickers.js";

import home from "./views/home.js";
import explore from "./views/explore.js";
import chat, { thread, notifications } from "./views/chat.js";
import went, { pass } from "./views/went.js";
import profile, { userProfile, membership } from "./views/profile.js";
import detail from "./views/detail.js";
import booking, { checkout, confirm } from "./views/booking.js";
import create, { published, blankDraft } from "./views/create.js";
import settings from "./views/settings.js";
import verify from "./views/verify.js";

/* ----------------------------------------------------------------- routes */
route("/",                home);
route("/explore",         explore);
route("/chat",            chat);
route("/went",            went);
route("/you",             profile);

route("/event/:id",       detail);
route("/book/:id",        booking);
route("/checkout/:id",    checkout);
route("/confirm/:id",     confirm);
route("/pass/:idx",       pass);
route("/thread/:key",     thread);
route("/u/:key",          userProfile);
route("/notifications",   notifications);
route("/membership",      membership);
route("/publish",         create);
route("/published",       published);
route("/verify",          verify);
route("/settings",        () => settings({ key: "root" }));
route("/settings/:key",   settings);

/* ------------------------------------------------------------------- tabs */
const shell = $("#shell");
const tabs = $("#tabs");
const ink = $("#tabs-ink");
const bar = $("#bar");
const dock = $("#dock");
const view = $("#view");

tabs.querySelectorAll(".tab").forEach((tab) => {
  tab.querySelector(".tab-ico").innerHTML =
    icon({ home: "home", explore: "compass", chat: "chat", went: "ticket", you: "user" }[tab.dataset.tab]);
});

/* Which tab owns a screen. A pushed page keeps its parent tab lit rather than
   lighting none — losing the highlight reads as having left the app. */
const TAB_FOR = {
  "/": "home", "/explore": "explore", "/chat": "chat", "/went": "went", "/you": "you",
  "/event": "explore", "/book": "explore", "/checkout": "explore", "/confirm": "explore",
  "/pass": "went", "/thread": "chat", "/u": "chat", "/notifications": "home",
  "/membership": "you", "/publish": "you", "/published": "you", "/settings": "you",
  "/verify": "you",
};

const ROOT_TITLE = { "/explore": "Explore", "/chat": "Chat", "/went": "Went", "/you": "You" };

function paintTabs(path) {
  const p = path.replace(/^#/, "") || "/";
  const key = TAB_FOR[p] || TAB_FOR["/" + p.split("/")[1]] || null;
  let active = null;
  tabs.querySelectorAll(".tab").forEach((tab) => {
    const on = tab.dataset.tab === key;
    tab.setAttribute("aria-current", on ? "page" : "false");
    if (on) active = tab;
  });
  if (!active) { ink.style.opacity = "0"; return; }
  ink.style.removeProperty("opacity");
  const box = active.getBoundingClientRect();
  const host = tabs.getBoundingClientRect();
  const inset = 5;
  ink.style.width = `${box.width - inset * 2}px`;
  ink.style.transform = `translateX(${box.left - host.left + inset}px)`;
  tabs.dataset.ready = "1";
}
addEventListener("resize", () => paintTabs(location.hash.replace(/^#/, "") || "/"));

/* Unread markers live on the tab bar, so they survive every navigation. */
function paintBadges() {
  const chatTab = tabs.querySelector('[data-tab="chat"]');
  chatTab.querySelector(".tab-dot")?.remove();
  if (unreadChats()) chatTab.insertAdjacentHTML("beforeend", '<i class="tab-dot"></i>');
}
subscribe(paintBadges);

/* ------------------------------------------------------------------- bars */
/* The view says what its bar and dock are; the shell just paints them. */
document.addEventListener("view:chrome", (e) => {
  const { bar: b, dock: d, tabs: showTabs } = e.detail;
  /* The router keys its scroll memory by the raw hash, so that is what it
     sends. Every map in here is keyed by the route, so strip the "#" once,
     here, rather than in five different lookups. */
  const path = e.detail.path.replace(/^#/, "") || "/";

  /* Three bars, and which one you get is not a style choice:
     · a pushed screen gets back + its title, always visible;
     · Home gets the place header, because where you are IS the screen;
     · every other tab root gets the mark plus its own title, which arrives
       only once the large heading has scrolled out from under it. */
  const isRoot = !!TAB_FOR[path];
  bar.innerHTML = b?.back || b?.close
    ? barBack(b.title, b.right || "")
    : isRoot && path !== "/"
      ? barRoot(b?.title || ROOT_TITLE[path] || "", b?.right || "")
      : !isRoot && b?.title
        ? barBack(b.title, b.right || "")
        : barPlace(cityName(), { bell: unreadNotifs() });
  if (b?.close) bar.querySelector("[data-back]").innerHTML = icon("close");

  dock.innerHTML = d || "";
  dock.hidden = !d;
  shell.dataset.dock = d ? "1" : "0";
  shell.dataset.tabs = showTabs ? "1" : "0";
  tabs.hidden = !showTabs;

  shell.dataset.titled = "0";
  paintTabs(path);
  paintBadges();
  lazyImages(bar);
});

/* --------------------------------------------------------------- the bar */
/* Scroll state, so the bar earns its background only once content is under it. */
let ticking = false;
addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    shell.dataset.scrolled = scrollY > 12 ? "1" : "0";
    /* Hand the page's heading over to the bar at the moment it leaves, so only
       one of the two is ever legible. */
    const h = view.querySelector(".title");
    if (h) {
      /* Measure the bar, do not parse --bar-h: a custom property comes back as
         its raw token ("calc(0px + 58px)"), parseFloat gives NaN, and every
         comparison against it is quietly false forever. */
      const gone = h.getBoundingClientRect().bottom < bar.offsetHeight + 4;
      shell.dataset.titled = gone ? "1" : "0";
      h.style.opacity = gone ? "0" : "1";
    } else {
      shell.dataset.titled = "0";
    }
    ticking = false;
  });
}, { passive: true });

/* -------------------------------------------------------- global actions */
/* Three things any view can ask for without importing the shell: go
   somewhere, go back, or save an event. Everything else is the view's own. */
document.addEventListener("click", (e) => {
  const back = e.target.closest("[data-back]");
  if (back) {
    haptic(6);
    history.length > 1 ? history.back() : go("#/");
    return;
  }
  const nav = e.target.closest("[data-go]");
  if (nav) { haptic(6); go(nav.dataset.go); return; }

  const sv = e.target.closest("[data-save]");
  if (sv) {
    e.preventDefault(); e.stopPropagation();
    const id = +sv.dataset.save;
    const on = toggleSave(id);
    haptic(8);
    sv.setAttribute("aria-pressed", on);
    toast(on ? "Saved" : "Removed from saved", on ? "bookmark" : "close");
    return;
  }

  const city = e.target.closest(".bar-brand");
  if (city) { e.preventDefault(); haptic(6); openCityPicker(); return; }

  const pay = e.target.closest("[data-pay]");
  if (pay) {
    const id = +pay.dataset.pay;
    state.myTickets.unshift({ eventId: id, tier: state.tierIdx, qty: state.qty, past: false });
    save();
    go(`#/confirm/${id}`);
    return;
  }

  const like = e.target.closest("[data-like]");
  if (like) {
    const on = like.getAttribute("aria-pressed") !== "true";
    like.setAttribute("aria-pressed", on);
    const n = like.querySelector("span");
    n.textContent = +n.textContent + (on ? 1 : -1);
    haptic(6);
  }
});

/* Segmented controls are the same everywhere, so they are handled once. */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-segkey]");
  if (!b) return;
  const seg = b.closest("[data-seg]");
  const id = seg.dataset.seg, key = b.dataset.segkey;
  haptic(6);
  if (id === "homefeed") state.homeFeed = key;
  if (id === "wenttab") state.wentTab = key;
  if (id === "profiletab") state.profileTab = key;
  save();
  render();
});

/* Publishing needs a fresh draft each time it is entered from a CTA, but not
   when the step buttons re-render the same flow. */
addEventListener("hashchange", () => {
  if (location.hash === "#/publish" && !state.create) state.create = blankDraft();
});

/* ------------------------------------------------------------------ boot */
/* PWA shortcuts arrive as ?go=<tab|publish>. A shortcut that quietly opens
   Home is worse than no shortcut, so it is honoured — then the query is
   scrubbed, so a reload or a shared link does not re-fire it. */
function shortcutHash() {
  let want;
  try { want = new URLSearchParams(location.search).get("go"); } catch { return null; }
  if (!want) return null;
  try { history.replaceState(null, "", location.pathname); } catch {}
  return { explore: "#/explore", went: "#/went", you: "#/you",
           chat: "#/chat", home: "#/", create: "#/publish", publish: "#/publish" }[want] || null;
}

const jump = shortcutHash();
if (jump) location.hash = jump;

startRouter();

/* Hold the veil until the first screen has actually painted, so the app is
   never seen mid-render. Returning visitors get a much shorter hold. */
document.body.insertAdjacentHTML("afterbegin", GRAIN_DEFS);

const boot = $("#boot");
document.addEventListener("view:rendered", function lift() {
  document.removeEventListener("view:rendered", lift);
  /* First visit holds long enough for the opening to actually play — a mark
     that gets cut off mid-draw is worse than no opening at all. A returning
     visitor has seen it and wants their app. */
  setTimeout(() => {
    boot.classList.add("gone");
    setTimeout(() => boot.remove(), 700);
    state.seenBoot = true; save();
  }, state.seenBoot ? 240 : 1150);
});

/* Not on localhost: a service worker in front of the dev server turns every
   edit into a cache-busting expedition. It earns its place on the deployed
   site, not here. */
const LOCAL = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
if ("serviceWorker" in navigator && !LOCAL && location.protocol === "https:") {
  addEventListener("load", () =>
    setTimeout(() => navigator.serviceWorker.register("sw.js").catch(() => {}), 1500));
} else if ("serviceWorker" in navigator && LOCAL) {
  navigator.serviceWorker.getRegistrations()
    .then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
}
