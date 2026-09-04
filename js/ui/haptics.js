/* Utility rule: haptics only at meaningful moments — a commit, a snap, an
   error. Over-feedback trains people to ignore all of it.
   Harmony rule: fire on the SAME frame as the visual, never after it. */
const can = typeof navigator !== 'undefined' && 'vibrate' in navigator;
let on = true;

export const setHaptics = v => { on = !!v; };
const buzz = p => { if (can && on) { try { navigator.vibrate(p); } catch {} } };

export const tap     = () => buzz(8);        // selection changed
export const commit  = () => buzz(14);       // an action landed
export const success = () => buzz([12, 40, 22]);
export const warn    = () => buzz([16, 60, 16]);
export const snap    = () => buzz(6);        // a sheet caught its detent
