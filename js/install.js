/* Add to Home Screen. Chrome hands us an event we can replay; iOS never will,
   so it gets told how instead. Either way the offer appears once, after the
   person has actually looked around, and never again once dismissed. */

import { $ } from "./util.js";
import { state, save } from "./store.js";
import { sheet } from "./ui.js";
import { icon } from "./icons.js";

let deferred = null;

addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; });

export const canInstall = () =>
  !!deferred || (/iPad|iPhone|iPod/.test(navigator.userAgent) && !navigator.standalone);

export const installed = () =>
  matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

export async function promptInstall() {
  if (deferred) {
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    if (outcome === "accepted") { state.installDismissed = true; save(); }
    return outcome === "accepted";
  }
  /* iOS: no API exists, so show the two taps it actually takes. */
  sheet(`
    <div class="sheet-t">Add to your home screen</div>
    <div class="stack" style="gap:14px">
      <div class="row"><span class="ico">${icon("share")}</span>
        <span class="row-copy"><span class="row-t">Tap Share</span>
          <span class="row-s">The square with an arrow, in Safari’s bar.</span></span></div>
      <div class="row"><span class="ico">${icon("plus")}</span>
        <span class="row-copy"><span class="row-t">Add to Home Screen</span>
          <span class="row-s">It opens full screen after that, like an app.</span></span></div>
      <button class="btn btn-soft" data-close style="margin-top:6px">Got it</button>
    </div>`, { label: "How to install" });
  state.installDismissed = true; save();
  return false;
}
