/* Publishing an event is the product's reason to exist, so the flow is four
   short steps with a visible spine and a live preview of the thing being made. */

import { state } from '../store.js';
import { CATS, catIcon, catLabel } from '../data/geo.js';
import { esc, money, amount } from '../util.js';
import { ico } from '../icons.js';
import { cover, sectionHead } from '../ui/parts.js';
import { cityName } from './home.js';

export const STEPS = ['The basics', 'When', 'Where', 'Entry'];

export const blankDraft = () => ({
  step: 0, title: '', cat: 'Nightlife', date: '', time: '', venue: '',
  city: cityName(), paid: false, price: '', about: '',
});

export function stepValid(d) {
  if (d.step === 0) return !!d.title.trim();
  if (d.step === 1) return !!d.date.trim();
  if (d.step === 2) return !!d.venue.trim();
  return true;
}

export function createView() {
  const d = state.create;
  const pct = ((d.step + 1) / STEPS.length) * 100;

  const preview = {
    id: 777, cat: d.cat, title: d.title || 'Your event',
    when: (d.date || 'Date TBC') + (d.time ? ' · ' + d.time : ''),
    venue: d.venue || 'Venue TBC', going: 1, friends: [],
    minPrice: d.paid ? (parseFloat(d.price) || 0) : 0,
  };

  const body = [
    /* 0 — basics */ `
      <div class="label">What is it called?</div>
      <div class="field">
        <input data-input="c_title" value="${esc(d.title)}" maxlength="60" enterkeyhint="next"
          placeholder="Warehouse Sessions Vol. 10" aria-label="Event title" autofocus>
      </div>
      <div class="t-sub" id="titleCount" style="font-size:11.5px;margin:6px 0 0 2px">${d.title.length}/60</div>

      <div class="label" style="margin-top:22px">Category</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${CATS.map(c => `<button class="pill press" data-act="c:cat" data-cat="${c.key}"
          aria-pressed="${d.cat === c.key ? 'true' : 'false'}">${ico(c.icon, 15)} ${esc(c.label)}</button>`).join('')}
      </div>

      <div class="label" style="margin-top:22px">Tell people what it is</div>
      <div class="field field-area">
        <textarea data-input="c_about" maxlength="400" rows="4"
          placeholder="Four rooms, one warehouse, house and techno until sunrise…"
          aria-label="Description">${esc(d.about)}</textarea>
      </div>`,

    /* 1 — when */ `
      <div class="label">Date</div>
      <div class="field">${ico('cal', 18)}
        <input data-input="c_date" value="${esc(d.date)}" placeholder="Sat, 14 Sep" aria-label="Date"></div>

      <div class="label" style="margin-top:20px">Start time</div>
      <div class="field">${ico('clock', 18)}
        <input data-input="c_time" value="${esc(d.time)}" placeholder="9:00 PM" aria-label="Start time"></div>

      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px">
        ${['Tonight', 'Tomorrow', 'Sat, 14 Sep', 'Sun, 15 Sep'].map(x =>
          `<button class="pill press" data-act="c:date" data-v="${esc(x)}">${esc(x)}</button>`).join('')}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
        ${['7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM'].map(x =>
          `<button class="pill press" data-act="c:time" data-v="${esc(x)}">${esc(x)}</button>`).join('')}
      </div>`,

    /* 2 — where */ `
      <div class="label">Venue</div>
      <div class="field">${ico('pin', 18)}
        <input data-input="c_venue" value="${esc(d.venue)}" placeholder="Pier 70" aria-label="Venue"></div>

      <div class="label" style="margin-top:20px">City</div>
      <button class="field press" data-act="picker" style="width:100%;text-align:left">
        ${ico('globe', 18)}<span class="t-body" style="flex:1">${esc(d.city)}</span>
        <span style="color:var(--ash)">${ico('down', 16)}</span>
      </button>

      <div class="row" style="margin-top:20px;gap:10px;padding:13px 14px;border-radius:var(--r-md);
           background:rgba(244,241,236,.045);border:1px solid var(--hair)">
        <span style="color:var(--ash);display:flex;flex:none">${ico('info', 18)}</span>
        <span class="t-sub" style="font-size:12.5px">Only people browsing ${esc(d.city)} will see this in
          their feed. You can change the city before you publish.</span>
      </div>`,

    /* 3 — entry */ `
      <div class="label">Entry</div>
      <div class="dock-row">
        <button class="btn ${d.paid ? 'btn-ghost' : ''} press" data-act="c:free" style="flex:1;height:46px;font-size:14.5px">Free</button>
        <button class="btn ${d.paid ? '' : 'btn-ghost'} press" data-act="c:paid" style="flex:1;height:46px;font-size:14.5px">Ticketed</button>
      </div>

      ${d.paid ? `
        <div class="label" style="margin-top:20px">Price per ticket</div>
        <div class="field">
          <span class="t-head" style="color:var(--ash)">$</span>
          <input data-input="c_price" value="${esc(d.price)}" inputmode="decimal" placeholder="25" aria-label="Price">
        </div>
        <div class="row" style="margin-top:14px;gap:10px;padding:13px 14px;border-radius:var(--r-md);
             background:rgba(244,241,236,.045);border:1px solid var(--hair)">
          <span style="color:var(--ash);display:flex;flex:none">${ico('wallet', 18)}</span>
          <span class="t-sub" style="font-size:12.5px">You keep
            <b style="color:var(--bone)" id="payoutValue">${amount(Math.max(0, (parseFloat(d.price) || 0) * 0.94))}</b>
            per ticket. Payouts land 24 hours after the event.</span>
        </div>`
      : `<div class="row" style="margin-top:16px;gap:10px;padding:13px 14px;border-radius:var(--r-md);
             background:rgba(244,241,236,.045);border:1px solid var(--hair)">
          <span style="color:var(--ash);display:flex;flex:none">${ico('users', 18)}</span>
          <span class="t-sub" style="font-size:12.5px">Free events collect RSVPs so you know how many to expect.</span>
        </div>`}

      <div style="margin-top:26px">
        ${sectionHead('How it will look')}
        <article class="card">
          <div class="cover" style="aspect-ratio:5/3">
            ${cover(preview)}<div class="cover-scrim"></div>
            <div class="cover-top"><span class="chip">${ico(catIcon(d.cat), 13)}${esc(catLabel(d.cat))}</span></div>
            <div class="cover-bot"><div class="t-title">${esc(preview.title)}</div></div>
          </div>
          <div style="padding:12px 14px 13px">
            <div class="row" style="gap:8px">
              <span class="t-sub" style="color:var(--bone);font-weight:600">${esc(preview.when)}</span>
              <span class="t-sub">·</span>
              <span class="t-sub" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(preview.venue)}</span>
              <span class="t-head" id="previewPrice" style="font-size:15px">${money(preview.minPrice)}</span>
            </div>
          </div>
        </article>
      </div>`,
  ][d.step];

  return `
  <div class="pad" style="padding-top:calc(max(var(--top),12px) + 58px)">
    <div class="row" style="justify-content:space-between;margin-bottom:8px">
      <span class="t-cap ash">Step ${d.step + 1} of ${STEPS.length}</span>
      <span class="t-cap ash">${esc(STEPS[d.step])}</span>
    </div>
    <div class="prog" style="margin-bottom:24px"><i style="width:${pct}%"></i></div>
    <h1 class="t-display" style="margin:0 0 20px;text-wrap:balance">${[
      'What are you putting on?', 'When does it happen?', 'Where is it?', 'How do people get in?',
    ][d.step]}</h1>
    ${body}
  </div>`;
}

export const createDock = () => {
  const d = state.create;
  const last = d.step === STEPS.length - 1;
  return `<div class="dock-row">
    ${d.step > 0 ? `<button class="btn btn-ghost press" data-act="c:back" style="flex:none;width:104px">Back</button>` : ''}
    <button class="btn ${last ? 'btn-ember' : ''} press" data-act="${last ? 'c:publish' : 'c:next'}"
      style="flex:1" ${stepValid(d) ? '' : 'disabled'}>${last ? 'Publish event' : 'Continue'}</button>
  </div>`;
};

export function publishedView() {
  return `
  <div class="pad" style="min-height:100%;display:flex;flex-direction:column;justify-content:center;
       align-items:center;text-align:center;padding-top:calc(max(var(--top),12px) + 40px)">
    <div style="width:96px;height:96px;border-radius:50%;display:grid;place-items:center;
         background:rgba(255,91,61,.12);border:1px solid rgba(255,91,61,.3);color:var(--ember);margin-bottom:24px">
      ${ico('sparkle', 42)}
    </div>
    <h1 class="t-display" style="margin:0 0 10px">It’s live.</h1>
    <p class="t-body ash" style="margin:0 0 26px;max-width:290px">
      Anyone browsing ${esc(cityName())} can find it now. Share the link and the RSVPs start arriving.
    </p>
    <div class="dock-row" style="width:100%">
      <button class="btn btn-ghost press" data-act="share" style="flex:1;height:46px;font-size:14px">
        ${ico('share', 17)} Share</button>
      <button class="btn btn-ghost press" data-act="toast" data-msg="Invite sheet is next in the build"
        style="flex:1;height:46px;font-size:14px">${ico('userplus', 17)} Invite</button>
    </div>
  </div>`;
}

export const publishedDock = () => `<div class="dock-row">
  <button class="btn btn-ghost press" data-act="tab" data-tab="home" style="flex:none;width:110px">Done</button>
  <button class="btn press" data-act="viewpublished" style="flex:1">View event</button></div>`;
