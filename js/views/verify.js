/* Getting verified.

   The badge is the thing a host looks at before they let you near a guest list,
   so the flow that earns it has to look like it was taken seriously. Three
   steps, each with one job and a picture of what is about to happen: hold up a
   document, show your face, wait. Nothing here talks to a server — the capture
   is simulated and says so — but the shape is the real shape. */

import { state, save, me } from "../store.js";
import { USERS } from "../data/people.js";
import { esc } from "../util.js";
import { icon } from "../icons.js";
import { avatar, note } from "../parts.js";
import { toast } from "../ui.js";
import { go, refresh } from "../router.js";
import { haptic, commit, warn } from "../motion.js";

export const STEPS = ["Your details", "Your document", "Your face"];

/* -------------------------------------------------------------- visuals */

/* A document in a frame, with the corner brackets a camera puts on screen. */
const docFrame = (state_ = "idle") => `
  <div class="vz vz-doc" data-state="${state_}">
    <svg viewBox="0 0 300 190" class="vz-art" aria-hidden="true">
      <defs>
        <linearGradient id="vzd" x1="0" y1="0" x2=".4" y2="1">
          <stop offset="0" stop-color="#241C2E"/><stop offset="1" stop-color="#120F16"/>
        </linearGradient>
      </defs>
      <rect x="42" y="34" width="216" height="126" rx="12" fill="url(#vzd)"
        stroke="rgba(244,241,236,.14)"/>
      <circle cx="86" cy="82" r="19" fill="rgba(244,241,236,.16)"/>
      <path d="M67 118a19 19 0 0 1 38 0z" fill="rgba(244,241,236,.16)"/>
      <rect x="124" y="66" width="104" height="8" rx="4" fill="rgba(244,241,236,.20)"/>
      <rect x="124" y="84" width="76" height="7" rx="3.5" fill="rgba(244,241,236,.13)"/>
      <rect x="124" y="100" width="88" height="7" rx="3.5" fill="rgba(244,241,236,.13)"/>
      <rect x="124" y="124" width="104" height="14" rx="3" fill="rgba(244,241,236,.08)"/>
      <g stroke="rgba(244,241,236,.10)" stroke-width="1">
        <path d="M126 128h100M126 133h100"/>
      </g>
    </svg>
    <span class="vz-c vz-tl"></span><span class="vz-c vz-tr"></span>
    <span class="vz-c vz-bl"></span><span class="vz-c vz-br"></span>
    <span class="vz-scan" aria-hidden="true"></span>
  </div>`;

/* A face guide: the oval every liveness check draws, with a soft sweep. */
const faceFrame = (state_ = "idle") => `
  <div class="vz vz-face" data-state="${state_}">
    <svg viewBox="0 0 240 240" class="vz-art" aria-hidden="true">
      <defs>
        <radialGradient id="vzf" cx=".5" cy=".42" r=".6">
          <stop offset="0" stop-color="#2A2233"/><stop offset="1" stop-color="#100D14"/>
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="104" fill="url(#vzf)"/>
      <circle cx="120" cy="104" r="34" fill="rgba(244,241,236,.17)"/>
      <path d="M64 186a56 56 0 0 1 112 0z" fill="rgba(244,241,236,.17)"/>
    </svg>
    <span class="vz-oval" aria-hidden="true"></span>
    <span class="vz-sweep" aria-hidden="true"></span>
  </div>`;

const check = (t) => `
  <li class="vz-req"><span class="vz-req-ic">${icon("check", 13)}</span>${esc(t)}</li>`;

/* ---------------------------------------------------------------- pages */

function done() {
  const u = USERS[me];
  return `
  <div class="wrap" style="padding-top:6vh">
    <div class="vz-done">
      <div class="vz-badge-wrap">
        ${avatar(me, 96)}
        <span class="vz-badge">${icon("check", 20)}</span>
      </div>
      <h1 class="display d-2" style="margin-top:22px">You’re verified.</h1>
      <p class="lede" style="font-size:15px;margin-top:10px;max-width:30ch">
        ${esc(u.name)} is a confirmed identity. Hosts can see the badge on your profile,
        on every RSVP, and beside your name in chat.
      </p>
    </div>

    <section class="section">
      <div class="rows">
        <div class="row-btn"><span class="ico">${icon("shield")}</span>
          <span class="row-copy"><span class="row-t">Identity confirmed</span>
            <span class="row-s">Checked 6 September 2026</span></span></div>
        <div class="row-btn"><span class="ico">${icon("ticket")}</span>
          <span class="row-copy"><span class="row-t">Guest lists</span>
            <span class="row-s">You can be added to members-only lists</span></span></div>
        <div class="row-btn"><span class="ico">${icon("sparkle")}</span>
          <span class="row-copy"><span class="row-t">Hosting</span>
            <span class="row-s">Verified hosts sell roughly twice as many tickets</span></span></div>
      </div>
    </section>

    <section class="section">
      <p class="tiny">Nothing was uploaded. Verification is simulated in this preview —
        no document was captured, stored or sent.</p>
    </section>
  </div>`;
}

function pending() {
  return `
  <div class="wrap" style="padding-top:8vh">
    <div class="vz-done">
      <span class="vz-spin" aria-hidden="true"></span>
      <h1 class="display d-2" style="margin-top:24px">Checking your document.</h1>
      <p class="lede" style="font-size:15px;margin-top:10px;max-width:30ch">
        This usually takes under a minute. You can close the app — we will notify you
        the moment it clears.
      </p>
    </div>
  </div>`;
}

export default function verify() {
  if (state.verified) {
    return { html: done(), tabs: false, bar: { back: true, title: "Verification" },
      dock: `<a class="btn btn-primary" href="#/you">Back to your profile</a>` };
  }

  const step = state.verifyStep || 0;

  if (step === 3) {
    return {
      html: pending(), tabs: false, bar: { close: true, title: "" },
      mount() {
        /* The wait is the point of the screen; two seconds is long enough to
           read as work and short enough not to feel broken. */
        setTimeout(() => {
          if ((state.verifyStep || 0) !== 3) return;
          state.verified = true; state.verifyStep = 0; save(); commit();
          refresh();
        }, 2400);
      },
    };
  }

  const bodies = [
    /* 0 — what this is and what you need */ `
      <p class="lede" style="font-size:15px">Verification is one badge, and it is the one
        hosts look for. It takes about a minute.</p>
      <ul class="vz-reqs">
        ${check("A government photo ID — passport, licence or national card")}
        ${check("Somewhere with decent light")}
        ${check("Your own face, not a photo of one")}
      </ul>
      <div style="padding-top:20px">
        ${note("Your document is checked and discarded. We keep the result, never the image.")}
      </div>`,

    /* 1 — the document */ `
      <p class="lede" style="font-size:15px">Lay your ID flat and fill the frame. Hold still
        until all four corners turn.</p>
      ${docFrame()}
      <ul class="vz-reqs">
        ${check("All four corners inside the frame")}
        ${check("No glare across the photo")}
        ${check("Every line readable")}
      </ul>`,

    /* 2 — the face */ `
      <p class="lede" style="font-size:15px">Now look straight at the camera and keep your
        face inside the oval.</p>
      ${faceFrame()}
      <ul class="vz-reqs">
        ${check("Nothing covering your face")}
        ${check("Eyes open, expression neutral")}
        ${check("One person in frame")}
      </ul>`,
  ];

  const last = step === STEPS.length - 1;
  const cta = ["Start", "Capture ID", "Take selfie"][step];

  return {
    html: `
    <div class="wrap">
      <div class="step-bar">
        ${STEPS.map((_, i) => `<span class="step-seg${i <= step ? " on" : ""}"><i></i></span>`).join("")}
      </div>
      <div class="label">Step ${step + 1} of ${STEPS.length}</div>
      <h1 class="display d-2" style="margin-top:8px">${STEPS[step]}</h1>
      <section class="section">${bodies[step]}</section>
    </div>`,
    tabs: false,
    bar: { back: true, title: "Get verified" },
    dock: `<div class="dock-row">
      ${step > 0 ? `<button class="btn btn-soft" type="button" id="vprev" style="flex:none;width:56px"
        aria-label="Back a step">${icon("back", 18)}</button>` : ""}
      <button class="btn btn-primary" type="button" id="vnext" style="flex:1">${cta}</button>
    </div>`,
    mount(el) {
      const dock = document.querySelector("#dock");

      dock?.querySelector("#vprev")?.addEventListener("click", () => {
        haptic(6); state.verifyStep = Math.max(0, step - 1); save(); refresh();
      });

      dock?.querySelector("#vnext")?.addEventListener("click", (e) => {
        const btn = e.currentTarget;
        if (step === 0) { haptic(8); state.verifyStep = 1; save(); refresh(); return; }

        /* Steps 1 and 2 are a capture: the frame runs its scan, the button
           locks, and only then do we advance. A capture that completes on the
           same frame as the tap does not read as a capture. */
        const frame = el.querySelector(".vz");
        if (!frame || frame.dataset.state === "busy") return;
        frame.dataset.state = "busy";
        btn.disabled = true;
        btn.textContent = step === 1 ? "Reading…" : "Checking…";
        haptic(6);

        setTimeout(() => {
          frame.dataset.state = "ok";
          commit();
          setTimeout(() => {
            state.verifyStep = last ? 3 : step + 1;
            save(); refresh();
          }, 620);
        }, 1500);
      });
    },
  };
}
