import { state, allPosts, unreadNotifs } from '../store.js';
import { eventsForCity } from '../data/events.js';
import { COUNTRIES } from '../data/geo.js';
import { USERS } from '../data/people.js';
import { esc, compact } from '../util.js';
import { ico } from '../icons.js';
import { markSVG } from '../icons.js';
import { eventCard, railCard, sectionHead, segmented, postCard, avatar, empty } from '../ui/parts.js';

export const cityName = () => COUNTRIES[state.country].cities[state.cityIdx];
export const countryName = () => COUNTRIES[state.country].name;
export const cityEvents = () => eventsForCity(cityName());

/* Why this event, for this person, right now. A feed without a reason is a
   list; the reason is what makes it feel like the app knows you. */
function reason(ev) {
  const f = (ev.friends || []).filter(k => state.followingUsers[k] && !state.blocked[k]);
  if (f.length >= 2) return `${USERS[f[0]].name.split(' ')[0]} and ${f.length - 1} more are going`;
  if (f.length === 1) return `${USERS[f[0]].name.split(' ')[0]} is going`;
  if (state.followingHosts[ev.host]) return `From ${ev.host}, who you follow`;
  if (ev.soon) return 'Starting tonight near you';
  if (ev.minPrice === 0) return 'Free, and close by';
  if (ev.member) return 'A members-only night';
  return `Popular in ${ev.cat === 'Food' ? 'food & drink' : ev.catLabel.toLowerCase()} this week`;
}

function score(ev) {
  let s = ev.going / 30;
  (ev.friends || []).forEach(k => { if (state.followingUsers[k]) s += 14; });
  if (state.followingHosts[ev.host]) s += 10;
  if (ev.soon) s += 8;
  if (state.saved.includes(ev.id)) s += 4;
  if (ev.member && !state.member) s -= 6;
  return s;
}

export function feedFor(kind) {
  const all = cityEvents();
  if (kind === 'following') {
    return all.filter(ev =>
      state.followingHosts[ev.host] ||
      (ev.friends || []).some(k => state.followingUsers[k] && !state.blocked[k]));
  }
  return all.slice().sort((a, b) => score(b) - score(a));
}

export function homeView() {
  const feed = feedFor(state.homeFeed);
  /* Soonest-first, and wide enough to be a rail rather than a lone card:
     tonight and tomorrow lead, then the weekend. */
  const SOON = ['Tonight', 'Tomorrow', 'Sat', 'Sun', 'Fri'];
  const soonRank = e => {
    const i = SOON.findIndex(d => e.when.startsWith(d));
    return i === -1 ? 99 : i;
  };
  const tonight = cityEvents()
    .filter(e => e.soon || soonRank(e) < 99)
    .sort((a, b) => soonRank(a) - soonRank(b) || b.going - a.going)
    .slice(0, 8);
  const posts = allPosts().slice(0, 4);
  const unread = unreadNotifs();
  const hero = feed[0];
  const rest = feed.slice(1);

  return `
  <div class="pad" style="padding-top:calc(max(var(--top),12px) + 6px)">

    <!-- identity + place -->
    <div class="row" style="justify-content:space-between;margin-bottom:16px">
      <button class="press" data-act="picker" style="text-align:left" aria-label="Change city">
        <div class="t-cap ash" style="display:flex;align-items:center;gap:5px;margin-bottom:2px">
          ${ico('pin', 12)} ${state.visiting ? 'Visiting' : 'You are in'}
        </div>
        <div class="row" style="gap:5px">
          <span class="t-title">${esc(cityName())}</span>
          <span style="color:var(--ash);margin-top:2px">${ico('down', 16)}</span>
        </div>
      </button>
      <div class="row" style="gap:8px">
        <button class="gbtn press" data-act="notifications" aria-label="Notifications${unread ? `, ${unread} unread` : ''}"
          style="position:relative">${ico('bell', 19)}
          ${unread ? `<i style="position:absolute;top:5px;right:5px;width:8px;height:8px;border-radius:50%;
             background:var(--ember);box-shadow:0 0 0 2px rgba(11,10,12,.9)"></i>` : ''}
        </button>
        <button class="gbtn press" data-act="tab" data-tab="explore" aria-label="Search">${ico('search', 19)}</button>
      </div>
    </div>

    <!-- feed switch -->
    ${segmented('homefeed', [
      { key:'foryou',    label:'For you' },
      { key:'following', label:'Following' },
    ], state.homeFeed)}

    ${tonight.length >= 2 && state.homeFeed === 'foryou' ? `
      <div style="margin-top:24px">
        ${sectionHead(tonight.some(e => e.soon || /^Tonight/.test(e.when))
          ? 'Happening tonight' : 'Happening this week')}
        <div class="rail">${tonight.map(railCard).join('')}</div>
      </div>` : ''}

    <div style="margin-top:26px">
      ${feed.length ? `
        ${sectionHead(state.homeFeed === 'foryou' ? 'Picked for you' : 'From people you follow')}
        ${hero ? `
          <div style="margin-bottom:8px">
            <div class="row" style="gap:7px;margin-bottom:9px">
              <span class="ember" style="display:flex">${ico('sparkle', 15)}</span>
              <span class="t-sub" style="color:var(--bone);font-weight:600">${esc(reason(hero))}</span>
            </div>
            ${eventCard(hero)}
          </div>` : ''}
        <div class="stack" style="--gap:14px;margin-top:14px">
          ${rest.slice(0, 8).map(eventCard).join('')}
        </div>` : empty('users', 'Nothing here yet',
          'Follow a few hosts or friends and their events land in this feed.',
          { act:'tab" data-tab="explore', label:'Browse ' + cityName() })}
    </div>

    ${posts.length ? `
      <div style="margin-top:30px">
        ${sectionHead('From your circle', { act:'tab" data-tab="profile', label:'See all' })}
        <div class="stack" style="--gap:12px">${posts.map(postCard).join('')}</div>
      </div>` : ''}

    <div style="text-align:center;padding:38px 0 10px;opacity:.4">
      <div style="display:flex;justify-content:center;margin-bottom:8px">${markSVG(26, 'var(--ash)')}</div>
      <div class="t-sub" style="font-size:11px;letter-spacing:.08em;text-transform:uppercase">
        ${esc(cityEvents().length)} events in ${esc(cityName())}
      </div>
    </div>
  </div>`;
}
