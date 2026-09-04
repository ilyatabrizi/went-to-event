import { state } from '../store.js';
import { CATS, catIcon, catLabel } from '../data/geo.js';
import { esc, compact } from '../util.js';
import { ico } from '../icons.js';
import { eventCard, eventRow, sectionHead, empty, cover } from '../ui/parts.js';
import { cityName, cityEvents } from './home.js';

export const WHEN  = ['Any time', 'Tonight', 'This weekend', 'Next 7 days'];
export const PRICE = ['Any price', 'Free', 'Under $25', 'Under $50'];
export const SORT  = ['Recommended', 'Soonest', 'Nearest', 'Price: low to high', 'Most going'];

export const filtersActive = () =>
  (state.whenIdx ? 1 : 0) + (state.priceIdx ? 1 : 0) + (state.sortIdx ? 1 : 0);

export function results() {
  let list = cityEvents().slice();
  const q = state.query.trim().toLowerCase();

  if (q) {
    list = list.filter(e =>
      (e.title + ' ' + e.host + ' ' + e.venue + ' ' + e.catLabel + ' ' + e.about)
        .toLowerCase().includes(q));
  }
  if (state.cat) list = list.filter(e => e.cat === state.cat);

  if (state.whenIdx === 1) list = list.filter(e => /Tonight/.test(e.when));
  if (state.whenIdx === 2) list = list.filter(e => /Sat|Sun|Tonight|Tomorrow/.test(e.when));
  if (state.whenIdx === 3) list = list.filter(e => !/Next/.test(e.when));

  if (state.priceIdx === 1) list = list.filter(e => e.minPrice === 0);
  if (state.priceIdx === 2) list = list.filter(e => e.minPrice < 25);
  if (state.priceIdx === 3) list = list.filter(e => e.minPrice < 50);

  const s = state.sortIdx;
  if (s === 1) list.sort((a, b) => (/Tonight/.test(b.when) ? 1 : 0) - (/Tonight/.test(a.when) ? 1 : 0));
  if (s === 2) list.sort((a, b) => a.dist - b.dist);
  if (s === 3) list.sort((a, b) => a.minPrice - b.minPrice);
  if (s === 4) list.sort((a, b) => b.going - a.going);
  return list;
}

/* Only the body re-renders while typing — re-rendering the whole screen would
   blur the input on every keystroke. */
export function discoverBody() {
  const list = results();
  const q = state.query.trim();

  if (!q && !state.cat && !filtersActive()) {
    const free = cityEvents().filter(e => e.minPrice === 0).slice(0, 5);
    const near = cityEvents().slice().sort((a, b) => a.dist - b.dist).slice(0, 5);
    return `
      <div style="margin-top:22px">
        ${sectionHead('Browse by category')}
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
          ${(() => {
            const counted = CATS.map(c => ({ ...c, n: cityEvents().filter(e => e.cat === c.key).length }));
            /* Curated order, but the empty ones sink — a tile that opens an
               empty list is a dead end, and in a generated city several are. */
            return counted.sort((a, b) => (b.n > 0) - (a.n > 0));
          })().map(c => {
            const n = c.n;
            return `<button class="press-sm" data-act="cat" data-cat="${c.key}"
              style="display:flex;align-items:center;gap:10px;padding:14px 13px;border-radius:var(--r-md);
                     background:rgba(244,241,236,.05);border:1px solid var(--hair);text-align:left">
              <span style="width:34px;height:34px;flex:none;border-radius:var(--r-full);display:grid;place-items:center;
                     background:rgba(244,241,236,.07);color:var(--bone)">${ico(c.icon, 17)}</span>
              <span style="flex:1;min-width:0">
                <span class="t-head" style="font-size:14px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.label)}</span>
                <span class="t-sub" style="font-size:11.5px${n ? '' : ';opacity:.55'}">${
                  n ? `${n} ${n === 1 ? 'event' : 'events'}` : 'Nothing yet'}</span>
              </span>
            </button>`;
          }).join('')}
        </div>
      </div>

      <div style="margin-top:28px">
        ${sectionHead('Free this week')}
        <div class="stack" style="--gap:4px">${free.map(e => eventRow(e)).join('')}</div>
      </div>

      <div style="margin-top:24px">
        ${sectionHead('Closest to you')}
        <div class="stack" style="--gap:4px">
          ${near.map(e => eventRow(e, { sub: `${e.dist} km · ${e.venue}` })).join('')}
        </div>
      </div>`;
  }

  if (!list.length) {
    return `<div style="margin-top:10px">${empty('search', 'No matches',
      q ? `Nothing in ${cityName()} matches “${q}”. Try a broader word, or clear the filters.`
        : `No ${state.cat ? catLabel(state.cat).toLowerCase() : ''} events match those filters in ${cityName()}.`,
      { act:'filter:clear', label:'Clear filters' })}</div>`;
  }

  return `<div style="margin-top:20px">
    <div class="t-sub" style="margin-bottom:12px">
      ${list.length} ${list.length === 1 ? 'result' : 'results'}${state.cat ? ' in ' + esc(catLabel(state.cat)) : ''}
    </div>
    <div class="stack" style="--gap:14px">${list.map(e => eventCard(e)).join('')}</div>
  </div>`;
}

export function discoverView() {
  const n = filtersActive();
  return `
  <div class="pad" style="padding-top:calc(max(var(--top),12px) + 6px)">
    <div class="row" style="justify-content:space-between;margin-bottom:14px">
      <h1 class="t-display" style="margin:0">Discover</h1>
      <button class="gbtn press" data-act="picker" aria-label="Change city">${ico('globe', 19)}</button>
    </div>

    <div class="field">
      ${ico('search', 18)}
      <input id="searchInput" data-input="search" type="search" enterkeyhint="search"
        autocomplete="off" autocorrect="off" spellcheck="false"
        placeholder="Search ${esc(cityName())}" value="${esc(state.query)}" aria-label="Search events">
      <button class="press" data-act="search:clear" aria-label="Clear search"
        style="display:${state.query ? 'flex' : 'none'};color:var(--ash)">${ico('close', 16)}</button>
    </div>

    <div class="rail" style="margin-top:12px;padding-top:2px;padding-bottom:2px">
      <button class="pill press ${n ? 'on' : ''}" data-act="filter:open">
        ${ico('slider', 15)} Filters ${n ? `<span class="pill-count">${n}</span>` : ''}
      </button>
      ${state.cat ? `<button class="pill press on" data-act="cat:clear">
          ${ico(catIcon(state.cat), 15)} ${esc(catLabel(state.cat))} ${ico('close', 13)}</button>` : ''}
      ${CATS.filter(c => c.key !== state.cat).slice(0, 8).map(c =>
        `<button class="pill press" data-act="cat" data-cat="${c.key}">${ico(c.icon, 15)} ${esc(c.label)}</button>`).join('')}
    </div>

    <div id="discoverBody">${discoverBody()}</div>
  </div>`;
}
