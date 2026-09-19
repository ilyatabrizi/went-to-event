/* Motion and touch feedback. Two questions the whole app asks: may I animate,
   and may I buzz. */

import { state } from "./store.js";

export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Haptics fire at commits and snaps only — a buzz on every tap stops meaning
   anything within a minute. Silently absent on iOS Safari, which is fine: it
   is reinforcement, never the signal itself. */
export function haptic(ms = 8) {
  if (!state.haptics || reduced()) return;
  try { navigator.vibrate?.(ms); } catch {}
}
/* Four patterns, and no warning pattern — there is no destructive confirmation
   left in the app. */
export const select  = () => haptic(6);          /* tab, chip, tier, stepper, back */
export const impact  = () => haptic(10);         /* a primary action committed */
export const success = () => haptic([10, 60, 20]); /* the RSVP lands */
export const warn    = () => haptic([14, 60, 14]);
