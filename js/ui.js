/* Toasts and bottom sheets — the two pieces of chrome every view borrows. */

import { $ } from "./util.js";
import { icon } from "./icons.js";
import { haptic, reduced } from "./motion.js";

/* ------------------------------------------------------------------ toast */
export function toast(message, name = "checkcirc", ms = 2600) {
  const root = $("#toast-root");
  if (!root) return;
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `${icon(name)}<span></span>`;
  node.lastElementChild.textContent = message;
  root.append(node);
  setTimeout(() => {
    node.classList.add("out");
    node.addEventListener("animationend", () => node.remove(), { once: true });
  }, ms);
}

/* ------------------------------------------------------------------ sheet */
let open = null;

export const sheetOpen = () => !!open;

export function closeSheet() {
  if (!open) return;
  const { el, scrim, onClose, onKey, lastFocus } = open;
  removeEventListener("keydown", onKey);
  open = null;
  el.classList.remove("in");
  scrim.classList.remove("in");
  document.body.style.removeProperty("overflow");
  lastFocus?.focus?.();
  setTimeout(() => { el.remove(); scrim.remove(); onClose?.(); }, reduced() ? 0 : 440);
}

/**
 * Bottom sheet. `render` is HTML or a function returning it; `mount` gets the
 * element once it is in the DOM. Dismiss by scrim, by [data-close], by Escape,
 * or by dragging down past a third of its height — the gesture iOS taught
 * everyone. Focus is trapped while it is up, and handed back on the way out.
 */
export function sheet(render, { mount, onClose, label = "Details" } = {}) {
  closeSheet();
  const lastFocus = document.activeElement;
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  const el = document.createElement("div");
  el.className = "sheet";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", label);
  el.innerHTML = `<div class="grab"></div>${typeof render === "function" ? render() : render}`;
  document.body.append(scrim, el);
  document.body.style.overflow = "hidden";

  const focusable = () => [...el.querySelectorAll(
    'button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])')]
    .filter((n) => !n.disabled && n.offsetParent !== null);

  const onKey = (e) => {
    if (e.key === "Escape") { closeSheet(); return; }
    if (e.key !== "Tab") return;
    const f = focusable();
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  addEventListener("keydown", onKey);
  open = { el, scrim, onClose, onKey, lastFocus };

  requestAnimationFrame(() => { scrim.classList.add("in"); el.classList.add("in"); });
  scrim.addEventListener("click", closeSheet);
  el.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheet(); });

  /* Drag to dismiss — armed only at the top of the sheet, so a scrollable
     body still scrolls. */
  let y0 = null, dy = 0;
  el.addEventListener("touchstart", (e) => {
    if (el.scrollTop > 2) return;
    y0 = e.touches[0].clientY; dy = 0;
    el.style.transition = "none";
  }, { passive: true });
  el.addEventListener("touchmove", (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    el.style.transform = `translateX(-50%) translateY(${dy}px)`;
  }, { passive: true });
  el.addEventListener("touchend", () => {
    if (y0 === null) return;
    el.style.removeProperty("transition");
    el.style.removeProperty("transform");
    if (dy > Math.min(160, el.offsetHeight / 3)) { haptic(8); closeSheet(); }
    y0 = null;
  });

  setTimeout(() => focusable()[0]?.focus(), reduced() ? 0 : 460);
  mount?.(el);
  return el;
}

/* --------------------------------------------------------------- stepper */
export const stepperHTML = (qty, { min = 1, max = 10 } = {}) => `
  <span class="stepper">
    <button type="button" data-dec aria-label="One fewer"${qty <= min ? " disabled" : ""}>−</button>
    <span>${qty}</span>
    <button type="button" data-inc aria-label="One more"${qty >= max ? " disabled" : ""}>+</button>
  </span>`;

export function stepper(node, { value, min = 1, max = 10, onChange }) {
  const out = node.querySelector("span");
  const dec = node.querySelector("[data-dec]"), inc = node.querySelector("[data-inc]");
  const set = (n) => {
    value = Math.min(max, Math.max(min, n));
    out.textContent = value;
    dec.disabled = value <= min; inc.disabled = value >= max;
    onChange(value);
  };
  dec.addEventListener("click", () => { haptic(6); set(value - 1); });
  inc.addEventListener("click", () => { haptic(6); set(value + 1); });
}

/* -------------------------------------------------------------- segmented */
export const segmented = (id, items, active) => `
  <div class="seg" data-seg="${id}" role="tablist">
    ${items.map((i) => `<button type="button" role="tab" data-segkey="${i.key}"
      aria-pressed="${i.key === active}" aria-selected="${i.key === active}"
      >${i.label}</button>`).join("")}
  </div>`;
