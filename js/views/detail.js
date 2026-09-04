import { state } from '../store.js';
import { byId } from '../data/events.js';
import { USERS } from '../data/people.js';
import { esc, compact, money, initials } from '../util.js';
import { ico } from '../icons.js';
import { cover, avatar, saveBtn, nameLine, eventRow, sectionHead } from '../ui/parts.js';
import { catIcon, catLabel } from '../data/geo.js';
import { cityEvents } from './home.js';

const HOST_BG = ['#2A2036','#20303A','#33261B','#243020','#1E2838','#2E1F30'];
const hostBg = h => HOST_BG[h.length % HOST_BG.length];

/* A schematic, not a map. An invented street grid that claims to be real is
   worse than an honest abstraction — this one says "roughly here" and stops. */
function miniMap(ev) {
  const seed = ev.id;
  const lines = [];
  for (let i = 1; i < 7; i++) {
    lines.push(`<path d="M0 ${i * 26 + (seed % 9)} H320" stroke="rgba(138,132,143,.14)" stroke-width="1"/>`);
    lines.push(`<path d="M${i * 46 + (seed % 13)} 0 V172" stroke="rgba(138,132,143,.14)" stroke-width="1"/>`);
  }
  return `<div style="position:relative;border-radius:var(--r-md);overflow:hidden;height:172px;
            background:linear-gradient(160deg,#15131A,#0C0A10);border:1px solid var(--hair)">
    <svg viewBox="0 0 320 172" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">
      ${lines.join('')}
      <path d="M0 96 C 80 86, 150 120, 320 78" stroke="rgba(138,132,143,.22)" stroke-width="7" fill="none"/>
    </svg>
    <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;place-items:center">
      <span style="position:absolute;width:70px;height:70px;border-radius:50%;
            background:radial-gradient(circle,rgba(255,91,61,.28),transparent 70%)"></span>
      <span style="width:16px;height:16px;border-radius:50%;background:var(--ember);
            box-shadow:0 0 0 4px rgba(255,91,61,.22),0 4px 14px rgba(0,0,0,.6)"></span>
    </div>
    <div style="position:absolute;left:10px;right:10px;bottom:10px" class="chip">
      ${ico('pin', 13)} ${esc(ev.address)} · ${ev.dist} km away
    </div>
  </div>`;
}

export function detailView({ id }) {
  const ev = byId(id);
  const locked = ev.member && !state.member;
  const friends = (ev.friends || []).filter(k => !state.blocked[k]);
  const following = !!state.followingHosts[ev.host];
  const more = cityEvents().filter(e => e.host === ev.host && e.id !== ev.id).slice(0, 3);
  const alike = cityEvents().filter(e => e.cat === ev.cat && e.id !== ev.id).slice(0, 4);

  return `
  <div>
    <!-- hero -->
    <div style="position:relative;aspect-ratio:5/4.4;overflow:hidden">
      <div class="cover" style="position:absolute;inset:0;aspect-ratio:auto">${cover(ev)}</div>
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,
        rgba(11,10,12,.55) 0%,rgba(11,10,12,.05) 32%,rgba(11,10,12,.55) 72%,var(--ink) 100%)"></div>

      <div style="position:absolute;top:max(var(--top),12px);left:14px;right:14px;
                  display:flex;justify-content:space-between;gap:8px">
        <button class="gbtn on-image press" data-act="back" aria-label="Back">${ico('back', 19)}</button>
        <div class="row" style="gap:8px">
          <button class="gbtn on-image press" data-act="share" aria-label="Share">${ico('share', 18)}</button>
          ${saveBtn(ev.id)}
        </div>
      </div>

      <div style="position:absolute;left:18px;right:18px;bottom:16px">
        <div class="row" style="gap:6px;margin-bottom:11px;flex-wrap:wrap">
          ${ev.soon ? `<span class="chip chip-ember">${ico('bolt', 13)}Tonight</span>` : ''}
          ${ev.member ? `<span class="chip chip-gold">${ico('diamond', 13)}Members only</span>` : ''}
          <span class="chip">${ico(catIcon(ev.cat), 13)}${esc(catLabel(ev.cat))}</span>
        </div>
        <h1 class="t-display" style="margin:0 0 8px;text-wrap:balance">${esc(ev.title)}</h1>
        <div class="t-sub" style="font-size:14px">${esc(ev.venue)} · ${ev.dist} km away</div>
      </div>
    </div>

    <div class="pad" style="margin-top:4px">

      <!-- when / where at a glance -->
      <div class="card" style="padding:4px">
        <div class="row" style="padding:12px 13px;gap:12px">
          <span style="width:38px;height:38px;flex:none;border-radius:12px;display:grid;place-items:center;
                background:rgba(244,241,236,.07);color:var(--bone)">${ico('cal', 18)}</span>
          <div style="flex:1;min-width:0">
            <div class="t-head" style="font-size:15px">${esc(ev.dateLong)}</div>
            <div class="t-sub" style="font-size:13px">${esc(ev.timeRange)}</div>
          </div>
          <button class="pill press on-quiet" data-act="toast" data-msg="Added to your calendar"
            aria-label="Add to calendar">Add</button>
        </div>
        <div style="height:1px;background:var(--hair);margin:0 13px"></div>
        <div class="row" style="padding:12px 13px;gap:12px">
          <span style="width:38px;height:38px;flex:none;border-radius:12px;display:grid;place-items:center;
                background:rgba(244,241,236,.07);color:var(--bone)">${ico('pin', 18)}</span>
          <div style="flex:1;min-width:0">
            <div class="t-head" style="font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.venue)}</div>
            <div class="t-sub" style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.address)}</div>
          </div>
          <button class="pill press on-quiet" data-act="toast" data-msg="Opening directions…"
            aria-label="Get directions">${ico('route', 15)} Directions</button>
        </div>
      </div>

      <!-- host -->
      <div class="row" style="margin-top:18px;gap:12px">
        <div class="av" style="width:46px;height:46px;background:${hostBg(ev.host)};font-size:15px">
          <span>${esc(initials(ev.host))}</span></div>
        <div style="flex:1;min-width:0">
          <div class="t-cap ash" style="margin-bottom:2px">Hosted by</div>
          <div class="t-head" style="font-size:15.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.host)}</div>
          <div class="t-sub" style="font-size:12.5px">${ev.hostEvents} events hosted</div>
        </div>
        <button class="pill press ${following ? 'on' : ''}" data-act="followhost" data-host="${esc(ev.host)}">
          ${following ? 'Following' : 'Follow'}
        </button>
      </div>

      <!-- who is going -->
      <div style="margin-top:22px">
        ${sectionHead(friends.length ? 'People you know' : 'Who is going')}
        ${friends.length ? `
          <div class="rail" style="gap:14px">
            ${friends.map(k => `<button class="press" data-act="user" data-key="${k}"
                style="width:64px;text-align:center">
                ${avatar(k, 54)}
                <div class="t-sub" style="font-size:11.5px;margin-top:6px;overflow:hidden;
                     text-overflow:ellipsis;white-space:nowrap">${esc(USERS[k].name.split(' ')[0])}</div>
              </button>`).join('')}
            <div style="width:64px;text-align:center">
              <div class="av" style="width:54px;height:54px;background:rgba(244,241,236,.06);font-size:13px;color:var(--ash)">
                +${Math.max(0, ev.going - friends.length)}</div>
              <div class="t-sub" style="font-size:11.5px;margin-top:6px">others</div>
            </div>
          </div>` : `
          <div class="t-body">${compact(ev.going)} people are going. Be the first of your friends.</div>`}
      </div>

      <!-- about -->
      <div style="margin-top:24px">
        ${sectionHead('About')}
        <p class="t-body" style="margin:0;color:rgba(244,241,236,.86)">${esc(ev.about)}</p>
      </div>

      <!-- tickets -->
      <div style="margin-top:24px">
        ${sectionHead(ev.minPrice === 0 ? 'Entry' : 'Tickets')}
        <div class="stack" style="--gap:8px">
          ${ev.tiers.map(t => `
            <div class="row" style="padding:13px 14px;border-radius:var(--r-sm);
                 background:rgba(244,241,236,.045);border:1px solid var(--hair)">
              <div style="flex:1;min-width:0">
                <div class="t-head" style="font-size:14.5px">${esc(t.name)}</div>
                <div class="t-sub" style="font-size:12.5px">${esc(t.desc)}</div>
              </div>
              <div class="t-head" style="font-size:15px">${money(t.price)}</div>
            </div>`).join('')}
        </div>
        ${locked ? `<div class="row" style="margin-top:12px;gap:9px;padding:12px 13px;border-radius:var(--r-sm);
             background:rgba(201,168,106,.09);border:1px solid rgba(201,168,106,.26)">
             <span style="color:var(--gold);display:flex;flex:none">${ico('lock', 17)}</span>
             <span class="t-sub" style="font-size:12.5px;color:rgba(244,241,236,.8)">
               This one is for members. Membership unlocks it and every other members-only night.</span>
           </div>` : ''}
      </div>

      <!-- where -->
      <div style="margin-top:24px">
        ${sectionHead('Where')}
        ${miniMap(ev)}
      </div>

      ${more.length ? `<div style="margin-top:26px">
        ${sectionHead('More from ' + ev.host)}
        <div class="stack" style="--gap:4px">${more.map(e => eventRow(e)).join('')}</div>
      </div>` : ''}

      ${alike.length ? `<div style="margin-top:24px">
        ${sectionHead('You might also like')}
        <div class="stack" style="--gap:4px">${alike.map(e => eventRow(e)).join('')}</div>
      </div>` : ''}

      <button class="row press" data-act="report:open" data-rtype="event" data-id="${ev.id}"
        style="margin:26px auto 0;gap:7px;color:var(--ash);font-size:12.5px">
        ${ico('flag', 15)} Report this event
      </button>
    </div>
  </div>`;
}

export function detailDock({ id }) {
  const ev = byId(id);
  const locked = ev.member && !state.member;
  if (locked) return `<button class="btn btn-gold press" data-act="premium">
      ${ico('diamond', 17)} Unlock with membership</button>`;
  const label = ev.minPrice === 0 ? 'RSVP · Free' : `Get tickets · from ${money(ev.minPrice)}`;
  return `<button class="btn press" data-act="book" data-id="${ev.id}">${esc(label)}</button>`;
}
