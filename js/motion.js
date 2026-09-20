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
export const tap     = () => haptic(6);
export const commit  = () => haptic([9, 40, 14]);
export const warn    = () => haptic([14, 60, 14]);
