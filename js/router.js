/* Hash routing. Five tabs plus the pages they open, each a function that
   returns HTML — or `{ html, mount }` when a view needs wiring once it is on
   the page. */

import { $ } from "./util.js";
import { closeSheet } from "./ui.js";

const routes = [];
let current = null;

export const route = (pattern, view) => routes.push({ pattern, view });

const match = (hash) => {
  const path = (hash.replace(/^#/, "") || "/").split("?")[0];
  for (const r of routes) {
    if (r.pattern === path) return { view: r.view, params: {} };
    if (r.pattern.includes(":")) {
      const p = r.pattern.split("/"), q = path.split("/");
      if (p.length !== q.length) continue;
      const params = {};
      const ok = p.every((seg, i) =>
        seg.startsWith(":") ? ((params[seg.slice(1)] = decodeURIComponent(q[i])), true) : seg === q[i]);
      if (ok) return { view: r.view, params };
    }
  }
  return null;
};

/* Going back to a list should land where you left it, not at the top. Going
   forward into a new screen should always start at the top. */
const scrollMemory = new Map();
let backing = false;
addEventListener("popstate", () => { backing = true; });

export async function render() {
  const view = $("#view");
  const hit = match(location.hash) || match("#/");

  /* Views hang clocks and listeners off their mount; this is their chance to
     take them down while their nodes are still on the page. */
  if (current) {
    document.dispatchEvent(new CustomEvent("view:leaving"));
    scrollMemory.set(current, scrollY);
  }
  current = (location.hash || "#/").split("?")[0];
  closeSheet();

  /* Home runs a full-bleed hero under the bar; every other view starts below
     it. Reset before mounting, because home's own mount is what turns it on. */
  $("#shell").dataset.hero = "0";

  const out = await hit.view(hit.params);
  const res = typeof out === "string" ? { html: out } : out;

  /* Every render gets a FRESH container, and mount() is handed that rather
     than #view itself. Setting #view.innerHTML would leave any listener a view
     bound to #view still attached — so after two visits a single tap fires the
     handler twice, and a toggle lands back where it started. Listeners die
     with the node they were bound to. */
  const screen = document.createElement("div");
  screen.className = "screen";
  screen.innerHTML = res.html;
  view.replaceChildren(screen);

  view.classList.remove("view-in");
  void view.offsetWidth;                        // restart the entrance
  view.classList.add("view-in");

  /* The bar and the dock belong to the view, not to the shell — a screen that
     cannot say what its own back button and primary action are ends up with
     the previous screen's. They are painted before mount, so a view's own
     wiring can find its dock in the DOM. */
  document.dispatchEvent(new CustomEvent("view:chrome", {
    detail: { path: current, bar: res.bar, dock: res.dock, tabs: res.tabs !== false },
  }));

  if (res.mount) res.mount(screen);

  const y = scrollMemory.get(current);
  scrollTo({ top: backing && y ? y : 0, behavior: "instant" });
  backing = false;
  document.dispatchEvent(new CustomEvent("view:rendered", { detail: { path: current } }));
}

export function startRouter() {
  addEventListener("hashchange", render);
  if (!location.hash) location.replace("#/");
  render();
}

export const go = (hash) => {
  /* Assigning the hash it already has fires no hashchange, so a view that
     "navigates" to itself would silently do nothing. Anything re-rendering the
     screen it is already on wants refresh(), and this catches the rest. */
  if (("#" + (location.hash.replace(/^#/, "") || "/")) === hash) return refresh();
  location.hash = hash;
};

/* Re-render the current route in place, keeping the scroll position — for a
   view whose own state changed but whose address did not. */
export async function refresh() {
  const y = scrollY;
  await render();
  scrollTo({ top: y, behavior: "instant" });
}
export const back = () => history.length > 1 ? history.back() : go("#/");
export const path = () => current;
