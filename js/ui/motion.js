/* Spring runner.
   Apple replaced mass/stiffness/damping with two designer parameters, and so do
   we: `damping` (1.0 = critically damped, no overshoot) and `response` (how
   fast it reaches the target, in seconds — NOT a duration; a spring has none).

   Every spring here starts from the PRESENTATION value and accepts an initial
   velocity, which is what makes interruption and gesture hand-off seamless. */

import { reduceMotion } from '../util.js';

export const SPRING = {
  ui:     { damping: 1.0, response: 0.36 },  // default: graceful, non-distracting
  move:   { damping: 1.0, response: 0.40 },  // reposition
  sheet:  { damping: 0.86, response: 0.32 }, // drawers — momentum precedes them
  flick:  { damping: 0.80, response: 0.38 }, // a throw earned its overshoot
  snap:   { damping: 1.0, response: 0.26 },  // small, immediate
};

export function spring(opts) {
  const {
    from = 0, to = 0, velocity = 0,
    damping = 1.0, response = 0.36,
    onUpdate, onComplete,
  } = opts;

  /* Reduced motion gets the end state, not a slow version of the animation.
     A hidden document gets it too — rAF is paused there, so a spring started
     while backgrounded would never settle and whatever waits on its callback
     would hang until the tab came back. */
  if (reduceMotion() || document.hidden) {
    onUpdate && onUpdate(to, 0);
    onComplete && onComplete();
    return { stop() {}, get value() { return to; }, get velocity() { return 0; }, done: true };
  }

  const w0 = (2 * Math.PI) / response;        // natural frequency
  const zeta = damping;
  let x = from - to, v = velocity, t0 = null, id = 0, stopped = false;

  /* Settle relative to the distance travelled, not on a fixed pixel budget.
     An absolute epsilon makes a long transition tick on invisibly for hundreds
     of milliseconds after it has visually arrived, which delays whatever waits
     on the completion callback. */
  const span = Math.max(1, Math.abs(from - to));
  const xEps = Math.max(0.08, span * 0.004);
  const vEps = Math.max(0.5, span * 0.06);
  const handle = {
    get value() { return x + to; },
    get velocity() { return v; },
    done: false,
    stop() { stopped = true; handle.done = true; cancelAnimationFrame(id); },
  };

  const step = (t) => {
    if (stopped) return;
    if (document.hidden) {                    // backgrounded mid-flight: land it
      x = 0; v = 0;
      onUpdate && onUpdate(to, 0);
      handle.done = true;
      onComplete && onComplete();
      return;
    }
    if (t0 == null) t0 = t;
    let dt = (t - t0) / 1000; t0 = t;
    if (dt > 0.064) dt = 0.064;               // a backgrounded tab must not explode

    /* Semi-implicit Euler, substepped so a long frame can't destabilise it. */
    const steps = Math.max(1, Math.ceil(dt / 0.004));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const a = -w0 * w0 * x - 2 * zeta * w0 * v;
      v += a * h;
      x += v * h;
    }

    const settled = Math.abs(x) < xEps && Math.abs(v) < vEps;
    if (settled) {
      x = 0; v = 0;
      onUpdate && onUpdate(to, 0);
      handle.done = true;
      onComplete && onComplete();
      return;
    }
    onUpdate && onUpdate(x + to, v);
    id = requestAnimationFrame(step);
  };
  id = requestAnimationFrame(step);
  return handle;
}

/* A value you can re-target mid-flight. Re-targeting carries the CURRENT
   velocity through, so a reversal blends instead of hitting a brick wall. */
export class Animatable {
  constructor(value, apply) {
    this.v = value; this.vel = 0; this.apply = apply; this.h = null;
  }
  set(value) {                       // hard set — used during 1:1 dragging
    this.stop(); this.v = value; this.vel = 0; this.apply(value);
  }
  to(target, cfg = SPRING.ui, velocity) {
    const v0 = velocity == null ? this.vel : velocity;
    this.stop();
    this.h = spring({
      from: this.v, to: target, velocity: v0,
      damping: cfg.damping, response: cfg.response,
      onUpdate: (val, vel) => { this.v = val; this.vel = vel; this.apply(val); },
      onComplete: () => { this.h = null; cfg.onEnd && cfg.onEnd(); },
    });
    return this.h;
  }
  stop() { if (this.h) { this.vel = this.h.velocity; this.h.stop(); this.h = null; } }
}

/* Two independent springs. A single spring over a 2D distance desyncs the
   moment X and Y carry different velocities. */
export const spring2d = (applyX, applyY, x0 = 0, y0 = 0) => ({
  x: new Animatable(x0, applyX),
  y: new Animatable(y0, applyY),
});
