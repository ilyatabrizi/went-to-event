/* Hash routing. Five tabs plus the pages they open, each a function that
   returns HTML — or `{ html, mount }` when a view needs wiring once it is on
   the page. */

import { $ } from "./util.js";
import { closeSheet } from "./ui.js";
import { reduced } from "./motion.js";

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

/* Going back to a list should land where you left it; going anywhere else should
   land at the top. Telling those apart is not as easy as it looks: `popstate`
   fires on a plain forward `location.hash = …` exactly as it does on a real
   Back, so listening for it alone restored a stale scroll position on EVERY
   navigation — tapping a tab dropped you back down the page you had last read,
   and the jump folded the tab bar on arrival.

   So each history entry is stamped with an index as it renders. A popstate is a
   Back only when the entry it lands on carries a LOWER index than the one being
   left. A brand-new forward entry carries no stamp at all, which is the same
   answer by a different route. */
const scrollMemory = new Map();
let navIndex = 0;
let backing = false;

function stampEntry() {
  if (history.state && typeof history.state.wte === "number") return;
  navIndex += 1;
  try { history.replaceState({ ...(history.state || {}), wte: navIndex }, ""); } catch {}
}

/* A real cross-fade where the browser can do one, a staggered arrival where it
   cannot. Never both: the stagger would run inside a frame the transition has
   already snapshotted, and you would see it twice. The flag is set once and
   read by CSS, which is what turns the stagger off. */
const USE_VT = typeof document.startViewTransition === "function" && !reduced();
document.documentElement.dataset.vt = USE_VT ? "1" : "0";
addEventListener("popstate", (e) => {
  const i = e.state && typeof e.state.wte === "number" ? e.state.wte : null;
  backing = i !== null && i < navIndex;
  if (i !== null) navIndex = i;
});

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
  stampEntry();
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

  /* Everything that changes on screen changes in ONE callback, so the browser
     can cross-fade the old frame into the new one instead of blinking. The
     chrome is named separately in CSS, so the bar and the tab bar hold still
     while the content underneath them changes. */
  const y = scrollMemory.get(current);
  const swap = () => {
    view.replaceChildren(screen);
    document.dispatchEvent(new CustomEvent("view:chrome", {
      detail: { path: current, bar: res.bar, dock: res.dock, tabs: res.tabs !== false },
    }));
    /* Scroll inside the same callback, so the snapshot the browser cross-fades
       to is the page as it will actually sit — not the new screen still
       showing the old screen's scroll offset. */
    scrollTo({ top: backing && y ? y : 0, behavior: "instant" });
  };

  /* A transition cannot start on a hidden document, and a second one started
     before the first finishes aborts it. Both are normal — a backgrounded tab,
     an impatient double tap — and both reject promises nobody is awaiting, so
     every one of them is swallowed here rather than surfacing as an error. */
  if (USE_VT && !document.hidden) {
    try {
      const vt = document.startViewTransition(swap);
      vt.ready.catch(() => {});
      vt.finished.catch(() => {});
      await vt.updateCallbackDone;
    } catch {
      /* startViewTransition itself refused: the DOM still has to change. */
      if (!view.firstElementChild || view.firstElementChild !== screen) swap();
    }
  } else {
    swap();
  }

  if (res.mount) res.mount(screen);
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
