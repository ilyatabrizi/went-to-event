/* A push/pop stack with an interactive edge-swipe back gesture.

   Spatial consistency: a screen that entered from the right leaves to the
   right. The parent underneath moves at 30% of the child's travel — the iOS
   parallax that tells you the old screen is still there, just behind. */

import { Animatable, SPRING, spring } from './ui/motion.js';
import { clamp, project, Velocity, reduceMotion } from './util.js';
import { closeSheet, sheetOpen } from './ui/sheet.js';

const EDGE = 26;          // px from the left edge that arms the gesture
const PARALLAX = 0.3;

export class Router {
  constructor(mount, { onChange } = {}) {
    this.mount = mount;
    this.stack = [];        // [{ name, params, node, scroll }]
    this.onChange = onChange;
    this.busy = false;
    this._armSwipe();
  }

  get top() { return this.stack[this.stack.length - 1]; }
  get depth() { return this.stack.length; }

  /* Jump a mid-flight transition to its end state. Called before every
     navigation so a spring that never settled — a backgrounded tab, a
     reduced-motion switch mid-animation — can't strand the stack. */
  _settle() {
    const p = this._pending;
    if (!p) return;
    this._pending = null;
    p.anim.stop();
    p.done();
  }

  /* Replace the whole stack — used by the tab bar, which is a lateral move,
     not a push, so it must not animate as one. */
  setRoot(name, render, params = {}) {
    this._settle();
    this.stack.forEach(s => s.node.remove());
    this.stack = [];
    const node = this._make(name, render, params);
    node.style.transform = 'translate3d(0,0,0)';
    this.mount.appendChild(node);
    this.stack.push({ name, params, node, render, scroll: 0 });
    this.mount.scrollTop = 0;
    this.onChange && this.onChange(this);
  }

  push(name, render, params = {}) {
    /* An impatient double-tap on a card should open one screen, not two. Same
       screen, same params, within a moment of the last push: ignore it. */
    const sig = name + '|' + JSON.stringify(params);
    const now = performance.now();
    if (sig === this._lastSig && now - (this._lastAt || 0) < 500) return;
    this._lastSig = sig; this._lastAt = now;

    this._settle();                 // never refuse a tap because a spring is mid-flight
    const prev = this.top;
    if (prev) prev.scroll = this.mount.scrollTop;
    const node = this._make(name, render, params);
    const w = this.mount.offsetWidth;
    node.style.transform = `translate3d(${w}px,0,0)`;
    this.mount.appendChild(node);
    this.stack.push({ name, params, node, render, scroll: 0 });
    this.mount.scrollTop = 0;
    this.onChange && this.onChange(this);

    if (reduceMotion()) {
      node.style.transform = 'translate3d(0,0,0)';
      if (prev) prev.node.style.display = 'none';
      return;
    }
    this.busy = true;
    const anim = new Animatable(w, v => {
      node.style.transform = `translate3d(${v}px,0,0)`;
      if (prev) {
        prev.node.style.transform = `translate3d(${-(w - v) * PARALLAX}px,0,0)`;
        prev.node.style.filter = `brightness(${1 - (1 - v / w) * 0.35})`;
      }
    });
    const done = () => {
      this._pending = null;
      this.busy = false;
      node.style.transform = 'translate3d(0,0,0)';
      if (prev) {
        prev.node.style.display = 'none';
        prev.node.style.filter = '';
        prev.node.style.transform = 'translate3d(0,0,0)';
      }
    };
    this._pending = { anim, done };
    anim.to(0, { ...SPRING.ui, onEnd: done });
  }

  pop(velocity = 0) {
    this._settle();
    if (this.stack.length < 2) return false;
    const cur = this.stack.pop();
    const prev = this.top;
    const w = this.mount.offsetWidth;
    prev.node.style.display = '';
    this.onChange && this.onChange(this);

    const finish = () => {
      this._pending = null;
      cur.node.remove();
      prev.node.style.filter = '';
      prev.node.style.transform = 'translate3d(0,0,0)';
      this.mount.scrollTop = prev.scroll || 0;
      this.busy = false;
    };
    if (reduceMotion()) { finish(); return true; }

    this.busy = true;
    const from = this._readX(cur.node);
    const anim = new Animatable(from, v => {
      cur.node.style.transform = `translate3d(${v}px,0,0)`;
      prev.node.style.transform = `translate3d(${-(w - v) * PARALLAX}px,0,0)`;
      prev.node.style.filter = `brightness(${1 - (1 - v / w) * 0.35})`;
    });
    this._pending = { anim, done: finish };
    anim.to(w, { ...SPRING.ui, onEnd: finish }, velocity);
    return true;
  }

  popTo(name) {
    this._settle();
    while (this.stack.length > 1 && this.top.name !== name) {
      this.stack.pop().node.remove();
    }
    const t = this.top;
    t.node.style.display = '';
    t.node.style.transform = 'translate3d(0,0,0)';
    t.node.style.filter = '';
    this.mount.scrollTop = t.scroll || 0;
    this.onChange && this.onChange(this);
  }

  /* Re-render the screen one below the top, so a pop returns to a screen that
     already reflects what just changed. Refreshing after the pop instead would
     mutate the stack while its animation is still running. */
  refreshBelow() {
    const t = this.stack[this.stack.length - 2];
    if (!t) return;
    const fresh = this._make(t.name, t.render, t.params);
    fresh.style.transform = t.node.style.transform || 'translate3d(0,0,0)';
    fresh.style.display = t.node.style.display;
    fresh.style.filter = t.node.style.filter;
    t.node.replaceWith(fresh);
    t.node = fresh;
  }

  /* Re-render the screen on top in place, keeping scroll position. Used when
     state changed but the user did not navigate. */
  refresh() {
    const t = this.top;
    if (!t) return;
    const scroll = this.mount.scrollTop;
    const fresh = this._make(t.name, t.render, t.params);
    fresh.style.transform = t.node.style.transform || 'translate3d(0,0,0)';
    t.node.replaceWith(fresh);
    t.node = fresh;
    this.mount.scrollTop = scroll;
    this.onChange && this.onChange(this);
  }

  _make(name, render, params) {
    const node = document.createElement('section');
    node.className = 'screen';
    node.dataset.screen = name;
    node.innerHTML = render(params) || '';
    return node;
  }

  _readX(node) {
    const m = new DOMMatrixReadOnly(getComputedStyle(node).transform);
    return m.m41 || 0;
  }

  /* ---- interactive edge swipe ----------------------------------------- */
  _armSwipe() {
    const m = this.mount;
    const vel = new Velocity();
    let active = false, startX = 0, startY = 0, decided = false, cur = null, prev = null, w = 0;

    m.addEventListener('pointerdown', e => {
      if (this.busy || this.stack.length < 2 || sheetOpen()) return;
      if (e.clientX - m.getBoundingClientRect().left > EDGE) return;
      active = true; decided = false;
      startX = e.clientX; startY = e.clientY;
      vel.reset(); vel.add(e.clientX);
      w = m.offsetWidth;
      cur = this.top; prev = this.stack[this.stack.length - 2];
    }, { passive: true });

    m.addEventListener('pointermove', e => {
      if (!active) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (!decided) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;   // hysteresis
        if (Math.abs(dy) > Math.abs(dx)) { active = false; return; } // it was a scroll
        decided = true;
        prev.node.style.display = '';
        m.style.overflowY = 'hidden';
      }
      const x = clamp(dx, 0, w);
      vel.add(e.clientX);
      cur.node.style.transform = `translate3d(${x}px,0,0)`;
      prev.node.style.transform = `translate3d(${-(w - x) * PARALLAX}px,0,0)`;
      prev.node.style.filter = `brightness(${1 - (1 - x / w) * 0.35})`;
      e.preventDefault();
    }, { passive: false });

    const end = () => {
      if (!active) return;
      active = false;
      m.style.overflowY = '';
      if (!decided) return;
      const v = vel.get();
      const x = this._readX(cur.node);
      /* Decide on the velocity SIGN, not the position — a fast short flick
         should still commit. */
      const projected = x + project(v);
      if (v > 120 || projected > w * 0.42) {
        this.stack.pop();
        this.busy = true;
        const anim = new Animatable(x, val => {
          cur.node.style.transform = `translate3d(${val}px,0,0)`;
          prev.node.style.transform = `translate3d(${-(w - val) * PARALLAX}px,0,0)`;
          prev.node.style.filter = `brightness(${1 - (1 - val / w) * 0.35})`;
        });
        this.onChange && this.onChange(this);
        anim.to(w, { ...SPRING.flick, onEnd: () => {
          cur.node.remove();
          prev.node.style.filter = '';
          prev.node.style.transform = 'translate3d(0,0,0)';
          m.scrollTop = prev.scroll || 0;
          this.busy = false;
        } }, v);
      } else {
        const anim = new Animatable(x, val => {
          cur.node.style.transform = `translate3d(${val}px,0,0)`;
          prev.node.style.transform = `translate3d(${-(w - val) * PARALLAX}px,0,0)`;
          prev.node.style.filter = `brightness(${1 - (1 - val / w) * 0.35})`;
        });
        anim.to(0, { ...SPRING.ui, onEnd: () => { prev.node.style.display = 'none'; prev.node.style.filter = ''; } }, v);
      }
    };
    m.addEventListener('pointerup', end);
    m.addEventListener('pointercancel', end);
  }
}
