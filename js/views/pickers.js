/* The two sheets that change what the whole app is showing: where you are, and
   how the list is filtered. */

import { state, save } from '../store.js';
import { COUNTRIES } from '../data/geo.js';
import { esc, clamp, reduceMotion } from '../util.js';
import { ico } from '../icons.js';
import { openSheet, closeSheet } from '../ui/sheet.js';
import { WHEN, PRICE, SORT, filtersActive } from './explore.js';
import { tap } from '../ui/haptics.js';

const ITEM_H = 42;

export function openLocationPicker({ onPick }) {
  const draft = { c: state.country, i: state.cityIdx };

  const cityPanel = () => {
    const co = COUNTRIES[draft.c];
    return co.cities.map((city, i) => `
      <button class="row press-sm" data-citypick="${i}"
        style="width:100%;gap:10px;padding:11px 13px;border-radius:var(--r-sm);text-align:left;
               background:${i === draft.i ? 'rgba(255,91,61,.13)' : 'transparent'};
               border:1px solid ${i === draft.i ? 'rgba(255,91,61,.3)' : 'transparent'}">
        <span style="flex:1" class="t-head">${esc(city)}</span>
        ${i === draft.i ? `<span class="ember" style="display:flex">${ico('check', 17)}</span>` : ''}
      </button>`).join('');
  };

  const body = `
    <p class="t-sub" style="margin:0 0 16px">Pick where you want to see events. Living somewhere shows you
      the full feed; visiting gives you a shorter, first-time-here list.</p>

    <div class="label">Country</div>
    <div style="position:relative;border-radius:var(--r-md);background:rgba(244,241,236,.04);
                border:1px solid var(--hair);overflow:hidden">
      <div class="wheel" id="wheel">
        <div style="height:84px"></div>
        ${COUNTRIES.map((c, i) => `<div class="witem" data-widx="${i}">
            <b>${c.flag} ${esc(c.name)}</b></div>`).join('')}
        <div style="height:84px"></div>
      </div>
      <div class="wheel-rule"></div>
    </div>

    <div class="label" style="margin-top:20px">City</div>
    <div id="cityPanel" class="stack" style="--gap:3px;padding-bottom:6px">${cityPanel()}</div>`;

  const foot = `
    <div class="dock-row">
      <button class="btn btn-ghost press" data-loc="visit" style="flex:none;width:132px">Just visiting</button>
      <button class="btn press" data-loc="live" style="flex:1">I live here</button>
    </div>`;

  const inst = openSheet({ title: 'Where to?', body, foot, id: 'location' });
  const sheet = inst.sheet;
  const wheel = sheet.querySelector('#wheel');
  const panel = sheet.querySelector('#cityPanel');

  /* 3D wheel: each row tilts away from the centre line, so the list reads as a
     drum rather than a flat scroller. */
  const paint = () => {
    const mid = wheel.scrollTop + wheel.clientHeight / 2;
    wheel.querySelectorAll('.witem').forEach(it => {
      const c = it.offsetTop + ITEM_H / 2;
      const r = (c - mid) / ITEM_H;
      const a = clamp(r * -21, -62, 62);
      it.style.transform = `rotateX(${a}deg) translateZ(${-Math.abs(r) * 22}px) scale(${Math.max(.8, 1 - Math.abs(r) * .07)})`;
      it.style.opacity = String(Math.max(.16, 1 - Math.abs(r) * .36));
      const b = it.querySelector('b');
      if (b) b.style.color = Math.abs(r) < .5 ? 'var(--ember)' : 'var(--bone)';
    });
  };
  wheel.scrollTop = draft.c * ITEM_H;
  requestAnimationFrame(paint);

  let settle;
  wheel.addEventListener('scroll', () => {
    requestAnimationFrame(paint);
    clearTimeout(settle);
    settle = setTimeout(() => {
      const idx = clamp(Math.round(wheel.scrollTop / ITEM_H), 0, COUNTRIES.length - 1);
      if (idx !== draft.c) { draft.c = idx; draft.i = 0; panel.innerHTML = cityPanel(); tap(); }
    }, 110);
  }, { passive: true });

  sheet.addEventListener('click', e => {
    const w = e.target.closest('[data-widx]');
    if (w) { wheel.scrollTo({ top: +w.dataset.widx * ITEM_H,
        behavior: reduceMotion() ? 'auto' : 'smooth' }); return; }
    const c = e.target.closest('[data-citypick]');
    if (c) { draft.i = +c.dataset.citypick; panel.innerHTML = cityPanel(); tap(); return; }
    const l = e.target.closest('[data-loc]');
    if (l) {
      state.country = draft.c; state.cityIdx = draft.i;
      state.visiting = l.dataset.loc === 'visit';
      state.cat = null; state.query = '';
      save(); closeSheet();
      onPick && onPick();
    }
  });
}

export function openFilterSheet({ onApply }) {
  const group = (label, key, items, active) => `
    <div style="margin-bottom:22px">
      <div class="label">${label}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${items.map((t, i) => `<button class="pill press" data-fkey="${key}" data-fidx="${i}"
          aria-pressed="${i === active ? 'true' : 'false'}">${esc(t)}</button>`).join('')}
      </div>
    </div>`;

  const body = group('When', 'whenIdx', WHEN, state.whenIdx)
             + group('Price', 'priceIdx', PRICE, state.priceIdx)
             + group('Sort by', 'sortIdx', SORT, state.sortIdx);

  const foot = `<div class="dock-row">
      <button class="btn btn-ghost press" data-fclear style="flex:none;width:112px">Reset</button>
      <button class="btn press" data-sheet-close style="flex:1">Show results</button>
    </div>`;

  const inst = openSheet({ title: 'Filters', body, foot, id: 'filters', onClose: onApply });
  inst.sheet.addEventListener('click', e => {
    const b = e.target.closest('[data-fkey]');
    if (b) {
      state[b.dataset.fkey] = +b.dataset.fidx;
      inst.sheet.querySelectorAll(`[data-fkey="${b.dataset.fkey}"]`)
        .forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      tap();
      return;
    }
    if (e.target.closest('[data-fclear]')) {
      state.whenIdx = state.priceIdx = state.sortIdx = 0;
      inst.sheet.querySelectorAll('[data-fidx]').forEach(x =>
        x.setAttribute('aria-pressed', x.dataset.fidx === '0' ? 'true' : 'false'));
      tap();
    }
  });
}
