import { state } from '../store.js';
import { byId } from '../data/events.js';
import { esc, money, compact } from '../util.js';
import { ico, badge } from '../icons.js';
import { cover, sectionHead } from '../ui/parts.js';

export const curTier = () => {
  const ev = byId(state.eventId);
  return ev.tiers[Math.min(state.tierIdx, ev.tiers.length - 1)];
};
const FEE = 2.5;   // per ticket, waived for members
export const fees = () => {
  const t = curTier();
  return (t.price > 0 && !state.member) ? FEE * state.qty : 0;
};
export const total = () => curTier().price * state.qty + fees();

export const METHODS = [
  { key:'apple', label:'Apple Pay',      sub:'Face ID',            icon:'apple' },
  { key:'card',  label:'Visa •••• 4242', sub:'Expires 06/29',      icon:'card'  },
  { key:'wallet',label:'WTE Balance',    sub:'$40.00 available',   icon:'wallet'},
];

/* ---- step 1: which ticket, how many ---- */
export function bookingView() {
  const ev = byId(state.eventId);
  const free = ev.minPrice === 0;
  return `
  <div class="pad" style="padding-top:calc(max(var(--top),12px) + 58px)">
    <div class="row" style="gap:12px;margin-bottom:22px">
      <div style="width:62px;height:62px;border-radius:var(--r-sm);overflow:hidden;position:relative;flex:none">
        ${cover(ev)}<div class="cover-scrim" style="opacity:.5"></div>
      </div>
      <div style="flex:1;min-width:0">
        <div class="t-head" style="font-size:15.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.title)}</div>
        <div class="t-sub" style="font-size:13px">${esc(ev.dateLong)} · ${esc(ev.timeRange)}</div>
        <div class="t-sub" style="font-size:13px">${esc(ev.venue)}</div>
      </div>
    </div>

    ${sectionHead(free ? 'Entry' : 'Choose a ticket')}
    <div class="stack" style="--gap:9px" role="radiogroup" aria-label="Ticket type">
      ${ev.tiers.map((t, i) => {
        const on = i === state.tierIdx;
        return `<button class="row press-sm" data-act="tier" data-idx="${i}" role="radio"
          aria-checked="${on ? 'true' : 'false'}"
          style="width:100%;padding:14px;gap:12px;border-radius:var(--r-md);text-align:left;
                 background:${on ? 'rgba(255,91,61,.10)' : 'rgba(244,241,236,.045)'};
                 border:1px solid ${on ? 'rgba(255,91,61,.34)' : 'var(--hair)'}">
          <span style="width:21px;height:21px;flex:none;border-radius:50%;display:grid;place-items:center;
                border:1.6px solid ${on ? 'var(--ember)' : 'var(--hair-2)'};
                background:${on ? 'var(--ember)' : 'transparent'};color:#180804">
            ${on ? ico('check', 13) : ''}</span>
          <span style="flex:1;min-width:0">
            <span class="t-head" style="font-size:15px;display:block">${esc(t.name)}</span>
            <span class="t-sub" style="font-size:12.5px">${esc(t.desc)}</span>
          </span>
          <span class="t-head" style="font-size:15px">${money(t.price)}</span>
        </button>`;
      }).join('')}
    </div>

    <div class="row" style="margin-top:22px;justify-content:space-between">
      <div>
        <div class="t-head" style="font-size:15px">How many?</div>
        <div class="t-sub" style="font-size:12.5px">Up to 10 per person</div>
      </div>
      <div class="step">
        <button class="press" data-act="qty" data-d="-1" ${state.qty <= 1 ? 'disabled' : ''} aria-label="One fewer">${ico('close', 15)}</button>
        <span class="n" aria-live="polite">${state.qty}</span>
        <button class="press" data-act="qty" data-d="1" ${state.qty >= 10 ? 'disabled' : ''} aria-label="One more">${ico('plus', 15)}</button>
      </div>
    </div>

    ${!state.member && curTier().price > 0 ? `
      <button class="row press-sm" data-act="premium" style="width:100%;margin-top:22px;gap:11px;padding:13px 14px;
        border-radius:var(--r-md);background:rgba(201,168,106,.08);border:1px solid rgba(201,168,106,.24);text-align:left">
        <span style="color:var(--gold);display:flex;flex:none">${ico('diamond', 19)}</span>
        <span style="flex:1">
          <span class="t-head" style="font-size:13.5px;display:block">Members pay no booking fee</span>
          <span class="t-sub" style="font-size:12px">You would save ${money(FEE * state.qty)} on this order</span>
        </span>
        <span style="color:var(--ash)">${ico('fwd', 16)}</span>
      </button>` : ''}
  </div>`;
}

export const bookingDock = () => {
  const t = curTier();
  return `<button class="btn press" data-act="tocheckout"
    style="justify-content:space-between;padding:0 22px">
    <span>${t.price === 0 ? 'Confirm RSVP' : 'Continue'}</span>
    <span style="opacity:.62">${money(t.price * state.qty)}</span></button>`;
};

/* ---- step 2: pay ---- */
export function checkoutView() {
  const ev = byId(state.eventId);
  const t = curTier();
  const paid = t.price > 0;
  const f = fees();
  return `
  <div class="pad" style="padding-top:calc(max(var(--top),12px) + 58px)">
    ${sectionHead('Order')}
    <div class="card" style="padding:15px">
      <div class="t-head" style="font-size:15.5px;margin-bottom:3px">${esc(ev.title)}</div>
      <div class="t-sub" style="font-size:13px">${esc(ev.dateLong)} · ${esc(ev.timeRange)}</div>
      <div style="height:1px;background:var(--hair);margin:13px 0"></div>
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <span class="t-body">${esc(t.name)} × ${state.qty}</span>
        <span class="t-body t-num">${money(t.price * state.qty)}</span>
      </div>
      ${paid ? `<div class="row" style="justify-content:space-between;margin-bottom:8px">
        <span class="t-body ash">Booking fee${state.member ? ' · waived' : ''}</span>
        <span class="t-body t-num ${state.member ? 'ash' : ''}"
          style="${state.member ? 'text-decoration:line-through' : ''}">${money(FEE * state.qty)}</span>
      </div>` : ''}
      <div style="height:1px;background:var(--hair);margin:13px 0"></div>
      <div class="row" style="justify-content:space-between">
        <span class="t-head">Total</span>
        <span class="t-head t-num" style="font-size:19px">${money(total())}</span>
      </div>
    </div>

    ${paid ? `
      <div style="margin-top:24px">
        ${sectionHead('Pay with')}
        <div class="stack" style="--gap:9px" role="radiogroup" aria-label="Payment method">
          ${METHODS.map((m, i) => {
            const on = i === state.methodIdx;
            return `<button class="row press-sm" data-act="method" data-idx="${i}" role="radio"
              aria-checked="${on ? 'true' : 'false'}"
              style="width:100%;padding:13px 14px;gap:12px;border-radius:var(--r-md);text-align:left;
                     background:${on ? 'rgba(255,91,61,.10)' : 'rgba(244,241,236,.045)'};
                     border:1px solid ${on ? 'rgba(255,91,61,.34)' : 'var(--hair)'}">
              <span style="width:38px;height:38px;flex:none;border-radius:11px;display:grid;place-items:center;
                    background:rgba(244,241,236,.08)">${ico(m.icon, 18)}</span>
              <span style="flex:1;min-width:0">
                <span class="t-head" style="font-size:14.5px;display:block">${esc(m.label)}</span>
                <span class="t-sub" style="font-size:12px">${esc(m.sub)}</span>
              </span>
              ${on ? `<span style="display:flex">${badge(20, 'var(--ember)', '#180804')}</span>` : ''}
            </button>`;
          }).join('')}
        </div>
      </div>` : `
      <div class="row" style="margin-top:22px;gap:10px;padding:14px;border-radius:var(--r-md);
           background:rgba(244,241,236,.045);border:1px solid var(--hair)">
        <span style="color:var(--ash);display:flex;flex:none">${ico('info', 18)}</span>
        <span class="t-sub" style="font-size:12.5px">This event is free. We hold your spot and send a
          reminder three hours before it starts.</span>
      </div>`}

    <div class="row" style="margin-top:20px;gap:9px;justify-content:center;color:var(--ash)">
      ${ico('lock', 14)}<span class="t-sub" style="font-size:11.5px">Payments are encrypted end to end</span>
    </div>
  </div>`;
}

export const checkoutDock = () => {
  const t = curTier();
  return `<button class="btn press" data-act="pay">
    ${t.price > 0 ? 'Pay ' + money(total()) : 'Confirm RSVP'}</button>`;
};

/* ---- step 3: it worked ---- */
export function confirmView() {
  const ev = byId(state.eventId);
  const t = curTier();
  return `
  <div class="pad" style="min-height:100%;display:flex;flex-direction:column;justify-content:center;
       align-items:center;text-align:center;padding-top:calc(max(var(--top),12px) + 40px)">
    <div id="confirmMark" style="width:96px;height:96px;border-radius:50%;display:grid;place-items:center;
         background:rgba(255,91,61,.12);border:1px solid rgba(255,91,61,.3);color:var(--ember);margin-bottom:24px">
      ${ico('check', 44)}
    </div>
    <h1 class="t-display" style="margin:0 0 10px">You’re going.</h1>
    <p class="t-body ash" style="margin:0 0 26px;max-width:290px">
      ${t.price > 0 ? `${state.qty} × ${esc(t.name)} confirmed.` : 'Your spot is held.'}
      We’ll remind you three hours before doors.
    </p>
    <div class="card" style="width:100%;padding:15px;text-align:left">
      <div class="row" style="gap:12px">
        <div style="width:52px;height:52px;border-radius:var(--r-sm);overflow:hidden;position:relative;flex:none">
          ${cover(ev)}</div>
        <div style="flex:1;min-width:0">
          <div class="t-head" style="font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.title)}</div>
          <div class="t-sub" style="font-size:12.5px">${esc(ev.dateLong)} · ${esc(ev.timeRange)}</div>
          <div class="t-sub" style="font-size:12.5px">${esc(ev.venue)}</div>
        </div>
      </div>
    </div>
    <button class="row press" data-act="toast" data-msg="Invite link copied"
      style="margin-top:20px;gap:8px;color:var(--bone);font-size:13.5px;font-weight:620">
      ${ico('userplus', 17)} Invite a friend
    </button>
  </div>`;
}

export const confirmDock = () => `<div class="dock-row">
  <button class="btn btn-ghost press" data-act="tab" data-tab="discover" style="flex:none;width:124px">Explore</button>
  <button class="btn press" data-act="viewticket" style="flex:1">View ticket</button></div>`;
