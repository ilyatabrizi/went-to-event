/* Wiring. Eight routes, three sheets, three tabs.
 *
 * The shell paints what the view declares and nothing else: there is no
 * TAB_FOR map, because every pushed view returns tabs:false and the back
 * chevron is the only way out — the one live case that map used to serve
 * produced a screen with a back arrow AND a lit tab that went to the same
 * place as the arrow. */

import { $ } from "./util.js";
import { icon } from "./icons.js";
import { route, startRouter, go, render, refresh } from "./router.js";
import { state, save, subscribe } from "./store.js";
import { barCity, barTitle, barBack } from "./parts.js";
import { GRAIN_DEFS } from "./artwork.js";
import { cityName } from "./place.js";
import { select } from "./motion.js";
import { openCityPicker } from "./views/pickers.js";

import home from "./views/home.js";
import went, { pass } from "./views/went.js";
import profile, { saved, host } from "./views/profile.js";
import detail from "./views/detail.js";
import create, { blankDraft } from "./views/create.js";

/* ----------------------------------------------------------------- routes */
route("/",            home);
route("/event/:id",   detail);
route("/pass/:idx",   pass);
route("/went",        went);
route("/you",         profile);
route("/saved",       saved);
route("/u/:key",      host);
route("/publish",     create);

const shell = $("#shell");
const bar = $("#bar");
const dock = $("#dock");
const tabbar = $("#tabbar");
const tabs = [...tabbar.querySelectorAll(".tab")];

/* The glyph never changes and is never filled — colour alone is the state. */
tabs.forEach((t) => {
  t.querySelector(".tab-ico").innerHTML =
    icon({ home: "home", went: "ticket", you: "user" }[t.dataset.tab], 24);
});

/* ------------------------------------------------------------------- bars */
document.addEventListener("view:chrome", (e) => {
  const { bar: b, dock: d, tabs: showTabs } = e.detail;
  const path = e.detail.path.replace(/^#/, "") || "/";

  bar.innerHTML =
    b?.kind === "back"  ? barBack(b.title, b.right || "")
  : b?.kind === "title" ? barTitle(b.title, b.right || "")
  : barCity(cityName());

  dock.innerHTML = d || "";
  dock.hidden = !d;
  shell.dataset.dock = d ? "1" : "0";
  shell.dataset.tabs = showTabs ? "1" : "0";
  tabbar.hidden = !showTabs;

  /* A tab is lit only on its own root. Pushed screens return tabs:false, so
     nothing is lit and nothing needs a map. */
  tabs.forEach((t) => t.setAttribute("aria-current",
    t.getAttribute("href") === `#${path}` ? "page" : "false"));
});

/* -------------------------------------------------------- global actions */
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-back]")) {
    select();
    history.length > 1 ? history.back() : go("#/");
    return;
  }
  if (e.target.closest("[data-city]")) { select(); openCityPicker(); return; }

  /* Tapping the tab you are already on returns to the top. */
  const tab = e.target.closest(".tab");
  if (tab && tab.getAttribute("aria-current") === "page") {
    e.preventDefault();
    select();
    scrollTo({ top: 0, behavior: "smooth" });
  }
});

/* A fresh draft each time publishing is entered from a CTA, but not when the
   step buttons re-render the same flow. */
addEventListener("hashchange", () => {
  if (location.hash === "#/publish" && !state.create) state.create = blankDraft();
});

/* --------------------------------------------------------------- startup */
/* PWA shortcuts arrive as ?go=<tab>. A shortcut that quietly opens Home is
   worse than no shortcut, so it is honoured — then the query is scrubbed. */
function shortcutHash() {
  let want;
  try { want = new URLSearchParams(location.search).get("go"); } catch { return null; }
  if (!want) return null;
  try { history.replaceState(null, "", location.pathname); } catch {}
  return { home: "#/", went: "#/went", you: "#/you", publish: "#/publish" }[want] || null;
}
const jump = shortcutHash();
if (jump) location.hash = jump;

document.body.insertAdjacentHTML("afterbegin", GRAIN_DEFS);
startRouter();

/* Not on localhost: a service worker in front of the dev server turns every
   edit into a cache-busting expedition. */
const LOCAL = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
if ("serviceWorker" in navigator && !LOCAL && location.protocol === "https:") {
  addEventListener("load", () =>
    setTimeout(() => navigator.serviceWorker.register("sw.js").catch(() => {}), 1500));
} else if ("serviceWorker" in navigator && LOCAL) {
  navigator.serviceWorker.getRegistrations()
    .then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
}
