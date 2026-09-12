/* The tab bar: five tabs on a floating capsule of glass.
 *
 * - The lens — the Bone capsule under the current tab — springs between tabs,
 *   and follows a finger dragged along the bar; letting go lands on the nearest.
 * - Reading down a long page folds the bar to the current tab alone. Scrolling
 *   back up, tapping it, or going anywhere opens it again.
 * - Tapping the tab you are on returns to that tab's root from a pushed screen,
 *   and scrolls to the top when you are already standing on it.
 *
 * Ported from KAIRO, where the shape was worked out, along with the three traps
 * that come with it: measure the row and never the folding tab, kill the
 * browser's own drag on the links, and treat a cancelled pointer as "put it
 * back" rather than "complete the gesture".
 */

import { $, $$, clamp } from "./util.js";
import { icon, iconFill } from "./icons.js";
import { haptic, reduced } from "./motion.js";
import { unreadChats } from "./store.js";

const ICONS = { home: "home", explore: "compass", chat: "chat", went: "ticket", you: "user" };

const bar = $("#tabbar");
const caps = $("#tabs");
const row = $("#tabs-row");
const tabs = $$(".tab", row);

let active = null;
let minimized = false;

/* Each tab carries its outline glyph and its filled one; CSS cross-fades
   between them, so the swap costs nothing at runtime. */
tabs.forEach((t) => {
  const name = ICONS[t.dataset.tab];
  t.querySelector(".tab-ico").innerHTML = icon(name, 20) + iconFill(name, 20);
});

/* Which tab owns a screen. A pushed page keeps its parent tab lit rather than
   lighting none — losing the highlight reads as having left the app. */
export const TAB_FOR = {
  "/": "home", "/explore": "explore", "/chat": "chat", "/went": "went", "/you": "you",
  "/event": "explore", "/book": "explore", "/checkout": "explore", "/confirm": "explore",
  "/pass": "went", "/thread": "chat", "/u": "chat", "/notifications": "home",
  "/membership": "you", "/publish": "you", "/published": "you", "/settings": "you",
  "/verify": "you",
};

/* ------------------------------------------------------------------- lens */
function place() {
  const i = tabs.findIndex((t) => t.dataset.tab === active);
  if (i < 0) { bar.classList.add("no-lens"); return; }
  bar.classList.remove("no-lens");
  const t = tabs[i];
  /* Folded, the whole row slides so the current tab sits at the left edge of
     the shrunken capsule. */
  const shift = minimized ? -t.offsetLeft : 0;
  bar.style.setProperty("--row-x", `${shift}px`);
  bar.style.setProperty("--lens-x", `${t.offsetLeft + shift}px`);
  bar.style.setProperty("--lens-w", `${t.offsetWidth}px`);
  bar.style.setProperty("--min-w", `${t.offsetWidth}px`);
  bar.dataset.ready = "1";
}

export function paintTabs(path) {
  const p = (path || "/").replace(/^#/, "") || "/";
  active = TAB_FOR[p] || TAB_FOR["/" + p.split("/")[1]] || null;
  tabs.forEach((t) => t.setAttribute("aria-current", t.dataset.tab === active ? "page" : "false"));
  setMin(false);                       // arriving anywhere opens the bar
  place();
}

export function setVisible(on) {
  bar.hidden = !on;
  if (on) requestAnimationFrame(place);   // measure only while it is on screen
}

/* Unread markers live on the bar, so they survive every navigation. */
export function paintBadges() {
  const chat = tabs.find((t) => t.dataset.tab === "chat");
  chat.querySelector(".tab-dot")?.remove();
  if (unreadChats()) chat.insertAdjacentHTML("beforeend", '<i class="tab-dot"></i>');
}

addEventListener("resize", () => place());

/* ------------------------------------------------------ fold on scroll */
function setMin(on) {
  /* Never fold a page you can see the end of — the bar would close and reopen
     on one flick, which is worse than not folding at all. */
  if (on && (!active || document.documentElement.scrollHeight - innerHeight < 700)) return;
  if (on === minimized) return;
  minimized = on;
  bar.classList.toggle("min", on);
  place();
}
export const expand = () => setMin(false);

let lastY = scrollY, run = 0;
addEventListener("scroll", () => {
  const y = scrollY, dy = y - lastY;
  lastY = y;
  if (y < 120) { run = 0; setMin(false); return; }
  /* Accumulate travel in one direction, so a jittery finger does not toggle
     the bar on every frame. */
  run = Math.sign(dy) === Math.sign(run) ? run + dy : dy;
  if (run > 48) setMin(true);
  else if (run < -28) setMin(false);
}, { passive: true });

/* ---------------------------------------------------------- drag the lens */
let drag = null, swallow = false;

/* The tabs are links, and a mouse dragged across a link starts the browser's
   own drag — which fires pointercancel on the first move and kills ours. Touch
   never shows this; only a mouse does. */
caps.addEventListener("dragstart", (e) => e.preventDefault());

caps.addEventListener("pointerdown", (e) => {
  if (minimized || e.button > 0 || !tabs.length) return;
  drag = { x0: e.clientX, id: e.pointerId, moved: false, idx: -1 };
});
caps.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x0;
  if (!drag.moved) {
    if (Math.abs(dx) < 8) return;
    drag.moved = true;
    try { caps.setPointerCapture(e.pointerId); } catch {}
    bar.classList.add("dragging");
    bar.classList.remove("no-lens");
  }
  const w = tabs[0].offsetWidth;
  const r = row.getBoundingClientRect();
  const x = clamp(e.clientX - r.left - w / 2, 0, r.width - w);
  bar.style.setProperty("--lens-x", `${x}px`);
  bar.style.setProperty("--lens-w", `${w}px`);
  const idx = clamp(Math.round(x / w), 0, tabs.length - 1);
  if (idx !== drag.idx) {
    drag.idx = idx;
    haptic(4);
    tabs.forEach((t, i) => t.classList.toggle("under", i === idx));
  }
});

function endDrag() {
  if (!drag) return;
  const d = drag;
  drag = null;
  bar.classList.remove("dragging");
  tabs.forEach((t) => t.classList.remove("under"));
  if (!d.moved) return;
  /* The click that follows the release must not also navigate. */
  swallow = true;
  setTimeout(() => { swallow = false; }, 0);
  const t = tabs[d.idx];
  if (t && location.hash !== t.getAttribute("href")) location.hash = t.getAttribute("href");
  else place();
}
caps.addEventListener("pointerup", endDrag);

/* A cancelled pointer — a system gesture taking over — puts the lens back and
   goes nowhere. It is never a completed drag. */
caps.addEventListener("pointercancel", () => {
  drag = null;
  bar.classList.remove("dragging");
  tabs.forEach((t) => t.classList.remove("under"));
  place();
});

caps.addEventListener("click", (e) => {
  if (swallow) { e.preventDefault(); e.stopPropagation(); return; }
  /* A folded bar opens on tap instead of navigating — otherwise the tabs you
     cannot see are the ones you would be aiming at. */
  if (minimized) { e.preventDefault(); e.stopPropagation(); setMin(false); return; }

  const t = e.target.closest(".tab");
  if (!t) return;
  const here = "#" + (location.hash.replace(/^#/, "") || "/");
  if (t.getAttribute("href") === here) {
    /* Already standing on this tab's root: go back to the top. From a pushed
       screen the href does the work instead, and takes you to the root. */
    e.preventDefault();
    haptic(6);
    scrollTo({ top: 0, behavior: reduced() ? "instant" : "smooth" });
  }
}, true);
