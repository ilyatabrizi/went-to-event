/* Bottom sheet with 1:1 drag, rubber-banded top edge, momentum projection to
   the nearest detent, and velocity hand-off into the settling spring.
   It is interruptible at every instant — grab a closing sheet and it follows
   the finger again rather than finishing the close first. */

import { Animatable, SPRING, spring } from './motion.js';
import { clamp, rubberband, project, Velocity, reduceMotion } from '../util.js';
import { snap as hapticSnap } from './haptics.js';

let root, current = null;

export function initSheets(node) { root = node; }
export const sheetOpen = () => !!current;

export function openSheet({ title, body, foot, detents = [1], onClose, id, dismissible = true }) {
  closeSheet(true);

  const scrim = document.createElement('div');
  scrim.className = 'scrim';

  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  if (title) sheet.setAttribute('aria-label', title);
  sheet.innerHTML =
    '<div class="grabber" aria-hidden="true"></div>' +
    (title ? `<div class="sheet-head"><div class="t-head" style="flex:1">${title}</div>
       <button class="gbtn press" data-sheet-close aria-label="Close">
       <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.8" stroke-linecap="round"><path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6"/></svg>
       </button></div>` : '') +
    `<div class="sheet-body">${body || ''}</div>` +
    (foot ? `<div class="sheet-foot">${foot}</div>` : '');

  root.appendChild(scrim);
  root.appendChild(sheet);

  const h = () => sheet.offsetHeight;
  /* detents are fractions of sheet height visible: 1 = fully up */
  const stops = detents.slice().sort((a, b) => a - b);
  const yFor = f => h() * (1 - f);

  const y = new Animatable(h(), v => {
    sheet.style.transform = `translate3d(0,${v}px,0)`;
    const p = 1 - clamp(v / h(), 0, 1);
    scrim.style.opacity = String(p);
  });
  y.set(h());

  const inst = { sheet, scrim, y, stops, yFor, onClose, id, dismissible, closing: false };
  current = inst;

  requestAnimationFrame(() => {
    y.to(yFor(stops[stops.length - 1]), SPRING.sheet);
    /* blur materialises with the movement, not after it */
    if (!reduceMotion()) {
      sheet.style.willChange = 'transform';
      spring({ from: 0, to: 1, ...SPRING.sheet, onUpdate: v => {
        sheet.style.backdropFilter = `blur(${v * 44}px) saturate(${100 + v * 80}%)`;
        sheet.style.webkitBackdropFilter = sheet.style.backdropFilter;
      }, onComplete: () => { sheet.style.backdropFilter = ''; sheet.style.webkitBackdropFilter = ''; } });
    }
  });

  /* ---- gesture --------------------------------------------------------- */
  const vel = new Velocity();
  let dragging = false, startY = 0, startVal = 0, fromBody = false;
  const scroller = sheet.querySelector('.sheet-body');

  const down = e => {
    if (!dismissible && !e.target.closest('.grabber')) { /* still allow drag, just snaps back */ }
    /* If the touch began inside a scrolled body that is not at the top, let the
       body scroll — grabbing the sheet there would fight the scroll. */
    fromBody = scroller && scroller.contains(e.target);
    if (fromBody && scroller.scrollTop > 0) return;
    dragging = true;
    y.stop();                              // interrupt: continue from the live value
    startY = e.clientY;
    startVal = y.v;
    vel.reset(); vel.add(e.clientY);
    sheet.setPointerCapture(e.pointerId);
  };
  const move = e => {
    if (!dragging) return;
    const raw = startVal + (e.clientY - startY);
    const top = yFor(stops[stops.length - 1]);
    let v = raw;
    if (raw < top) v = top - rubberband(top - raw, h());   // soft ceiling
    y.set(v);
    vel.add(e.clientY);
    if (fromBody) e.preventDefault();
  };
  const up = e => {
    if (!dragging) return;
    dragging = false;
    try { sheet.releasePointerCapture(e.pointerId); } catch {}
    const v = vel.get();                                   // px/s, down = positive
    const projected = y.v + project(v);                    // where the throw lands

    const targets = stops.map(yFor);
    if (dismissible) targets.push(h());                    // closed is a detent too
    let best = targets[0], bestD = Infinity;
    targets.forEach(t => { const d = Math.abs(t - projected); if (d < bestD) { bestD = d; best = t; } });

    if (dismissible && best === h()) return close(v);
    hapticSnap();
    y.to(best, SPRING.sheet, v);
  };

  sheet.addEventListener('pointerdown', down);
  sheet.addEventListener('pointermove', move, { passive: false });
  sheet.addEventListener('pointerup', up);
  sheet.addEventListener('pointercancel', up);

  scrim.addEventListener('click', () => dismissible && close());
  sheet.addEventListener('click', e => {
    if (e.target.closest('[data-sheet-close]')) close();
  });

  function close(velocity = 0) {
    if (inst.closing) return;
    inst.closing = true;
    if (current === inst) current = null;
    y.to(h(), SPRING.sheet, velocity);
    spring({ from: Number(scrim.style.opacity || 1), to: 0, ...SPRING.ui,
      onUpdate: v => { scrim.style.opacity = String(v); },
      onComplete: () => { scrim.remove(); sheet.remove(); onClose && onClose(); } });
  }
  inst.close = close;

  /* Move focus into the dialog so a keyboard user is not stranded behind the
     scrim — but onto the dialog itself, not its close button. */
  sheet.tabIndex = -1;
  setTimeout(() => sheet.focus({ preventScroll: true }), 60);

  /* Tab must not walk out of an open sheet and into the screen behind it. */
  sheet.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = [...sheet.querySelectorAll(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
      .filter(n => n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  return inst;
}

export function closeSheet(immediate) {
  if (!current) return false;
  if (immediate) {
    current.scrim.remove(); current.sheet.remove();
    const c = current; current = null;
    c.onClose && c.onClose();
    return true;
  }
  current.close();
  return true;
}
export const currentSheetId = () => current && current.id;
