import { state, allPosts, me } from '../store.js';
import { USERS } from '../data/people.js';
import { byId } from '../data/events.js';
import { esc, compact } from '../util.js';
import { ico } from '../icons.js';
import { avatar, verified, eventRow, postCard, segmented, empty, sectionHead, cover } from '../ui/parts.js';
import { cityEvents } from './home.js';

const countFollowing = () => Object.values(state.followingUsers).filter(Boolean).length;
const countHosts = () => Object.values(state.followingHosts).filter(Boolean).length;

/* A cover woven from the brand palette — no photo, because the user has not
   given us one and a stock photo standing in for a real person reads as fake. */
function bannerFor(key) {
  const h = key.length * 37;
  return `<svg viewBox="0 0 400 150" preserveAspectRatio="none" style="width:100%;height:100%" aria-hidden="true">
    <defs><linearGradient id="pb${key}" x1="0" y1="0" x2=".6" y2="1">
      <stop offset="0" stop-color="#241E2C"/><stop offset="1" stop-color="#0C0A10"/></linearGradient></defs>
    <rect width="400" height="150" fill="url(#pb${key})"/>
    <g fill="none" stroke="#F4F1EC" stroke-width="1" opacity=".16">
      <circle cx="${60 + h % 200}" cy="30" r="88"/><circle cx="${300 - h % 120}" cy="130" r="64"/>
    </g>
    <circle cx="${340 - h % 60}" cy="${40 + h % 30}" r="4" fill="#FF5B3D" opacity=".8"/>
  </svg>`;
}

export function profileView() {
  const u = USERS[me];
  const mine = allPosts().filter(p => p.author === me);
  const saved = state.saved.map(id => byId(id)).filter(Boolean);
  const going = state.myTickets.map(t => byId(t.eventId)).filter(Boolean);

  const tab = state.profileTab;
  const body =
    tab === 'posts' ? (mine.length
      ? `<div class="stack" style="--gap:12px">${mine.map(postCard).join('')}</div>`
      : empty('camera', 'No posts yet', 'Post about a night out and it lands on your profile and in your friends’ feeds.',
          { act:'compose:post', label:'Write something' }))
    : tab === 'saved' ? (saved.length
      ? `<div class="stack" style="--gap:4px">${saved.map(e => eventRow(e)).join('')}</div>`
      : empty('bookmark', 'Nothing saved', 'Tap the bookmark on any event and it waits for you here.'))
    : (going.length
      ? `<div class="stack" style="--gap:4px">${going.map(e => eventRow(e)).join('')}</div>`
      : empty('ticket', 'Nothing booked', 'Events you RSVP to or buy tickets for show up here.'));

  return `
  <div>
    <div style="position:relative;height:150px;overflow:hidden">
      ${bannerFor(me)}
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,10,12,.4),var(--ink))"></div>
      <div style="position:absolute;top:max(var(--top),12px);left:14px;right:14px;
                  display:flex;justify-content:flex-end;gap:8px">
        <button class="gbtn on-image press" data-act="compose:post" aria-label="New post">${ico('plus', 19)}</button>
        <button class="gbtn on-image press" data-act="settings" aria-label="Settings">${ico('gear', 19)}</button>
      </div>
    </div>

    <div class="pad" style="margin-top:-42px;position:relative">
      <div class="row" style="align-items:flex-end;gap:14px;margin-bottom:14px">
        <div style="border-radius:var(--r-full);padding:3px;background:var(--ink)">${avatar(me, 82)}</div>
        <div style="flex:1;padding-bottom:4px">
          <div class="row" style="justify-content:space-around">
            ${[[mine.length, 'Posts'], [compact(u.followers), 'Followers'], [countFollowing() + countHosts(), 'Following']]
              .map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('')}
          </div>
        </div>
      </div>

      <div class="row" style="gap:5px;margin-bottom:3px">
        <h1 class="t-title" style="margin:0">${esc(u.name)}</h1>${verified(me)}
        ${state.member ? `<span class="chip chip-gold" style="height:22px;font-size:10px;padding:0 8px">
           ${ico('diamond', 11)}Member</span>` : ''}
      </div>
      <div class="t-sub" style="font-size:13.5px">@${esc(u.handle)}</div>
      <p class="t-body" style="margin:9px 0 0;color:rgba(244,241,236,.84)">${esc(u.bio)}</p>

      <div class="dock-row" style="margin-top:16px">
        <button class="btn btn-ghost press" data-act="settings" style="flex:1;height:44px;font-size:14px">Edit profile</button>
        <button class="btn btn-ghost press" data-act="share" style="flex:none;width:52px;height:44px">${ico('share', 18)}</button>
      </div>

      <!-- host CTA: publishing is the whole product, so it is never buried -->
      <button class="row press-sm" data-act="create" style="width:100%;margin-top:14px;gap:12px;padding:15px 14px;
        border-radius:var(--r-md);background:linear-gradient(120deg,rgba(255,91,61,.14),rgba(255,91,61,.05));
        border:1px solid rgba(255,91,61,.28);text-align:left">
        <span style="width:42px;height:42px;flex:none;border-radius:13px;display:grid;place-items:center;
              background:var(--ember);color:#180804">${ico('plus', 21)}</span>
        <span style="flex:1">
          <span class="t-head" style="font-size:15px;display:block">Publish an event</span>
          <span class="t-sub" style="font-size:12.5px">Four steps, live in about a minute</span>
        </span>
        <span style="color:var(--ash)">${ico('fwd', 17)}</span>
      </button>

      ${!state.member ? `
        <button class="row press-sm" data-act="premium" style="width:100%;margin-top:10px;gap:12px;padding:15px 14px;
          border-radius:var(--r-md);background:rgba(201,168,106,.08);border:1px solid rgba(201,168,106,.24);text-align:left">
          <span style="width:42px;height:42px;flex:none;border-radius:13px;display:grid;place-items:center;
                background:rgba(201,168,106,.18);color:var(--gold)">${ico('diamond', 20)}</span>
          <span style="flex:1">
            <span class="t-head" style="font-size:15px;display:block">Become a member</span>
            <span class="t-sub" style="font-size:12.5px">No booking fees, members-only nights</span>
          </span>
          <span style="color:var(--ash)">${ico('fwd', 17)}</span>
        </button>` : ''}

      <div style="margin-top:22px">
        ${segmented('profiletab', [
          { key:'posts', label:'Posts' },
          { key:'saved', label:`Saved${saved.length ? ' · ' + saved.length : ''}` },
          { key:'going', label:`Going${going.length ? ' · ' + going.length : ''}` },
        ], tab)}
      </div>

      <div style="margin-top:18px">${body}</div>
    </div>
  </div>`;
}

export function userProfileView({ key }) {
  const u = USERS[key];
  if (!u) return empty('user', 'Not found', 'This profile is no longer available.');
  const following = !!state.followingUsers[key];
  const blocked = !!state.blocked[key];
  const posts = allPosts().filter(p => p.author === key);
  const shared = cityEvents().filter(e => (e.friends || []).includes(key)).slice(0, 4);

  return `
  <div>
    <div style="position:relative;height:150px;overflow:hidden">
      ${bannerFor(key)}
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,10,12,.4),var(--ink))"></div>
      <div style="position:absolute;top:max(var(--top),12px);left:14px;right:14px;
                  display:flex;justify-content:space-between;gap:8px">
        <button class="gbtn on-image press" data-act="back" aria-label="Back">${ico('back', 19)}</button>
        <button class="gbtn on-image press" data-act="more" data-mtype="user" data-key="${key}"
          aria-label="More">${ico('more', 19)}</button>
      </div>
    </div>

    <div class="pad" style="margin-top:-42px;position:relative">
      <div class="row" style="align-items:flex-end;gap:14px;margin-bottom:14px">
        <div style="border-radius:var(--r-full);padding:3px;background:var(--ink)">${avatar(key, 82)}</div>
        <div style="flex:1;padding-bottom:4px">
          <div class="row" style="justify-content:space-around">
            ${[[posts.length, 'Posts'], [compact(u.followers), 'Followers'], [compact(u.following), 'Following']]
              .map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('')}
          </div>
        </div>
      </div>

      <div class="row" style="gap:5px;margin-bottom:3px">
        <h1 class="t-title" style="margin:0">${esc(u.name)}</h1>${verified(key)}
      </div>
      <div class="t-sub" style="font-size:13.5px">@${esc(u.handle)}</div>
      <p class="t-body" style="margin:9px 0 0;color:rgba(244,241,236,.84)">${esc(u.bio)}</p>

      ${blocked ? `
        <div class="row" style="margin-top:16px;gap:10px;padding:14px;border-radius:var(--r-md);
             background:rgba(244,241,236,.045);border:1px solid var(--hair)">
          <span style="color:var(--ash);display:flex">${ico('shield', 18)}</span>
          <span class="t-sub" style="flex:1;font-size:12.5px">You blocked this account. They cannot message you or see your posts.</span>
          <button class="pill press" data-act="unblock" data-key="${key}">Unblock</button>
        </div>`
      : `<div class="dock-row" style="margin-top:16px">
          <button class="btn ${following ? 'btn-ghost' : ''} press" data-act="followuser" data-key="${key}"
            style="flex:1;height:44px;font-size:14px">${following ? 'Following' : 'Follow'}</button>
          <button class="btn btn-ghost press" data-act="thread" data-key="${key}"
            style="flex:1;height:44px;font-size:14px">Message</button>
        </div>`}

      ${!blocked ? `
        ${shared.length ? `<div style="margin-top:24px">
          ${sectionHead('Going to')}
          <div class="stack" style="--gap:4px">${shared.map(e => eventRow(e)).join('')}</div>
        </div>` : ''}

        <div style="margin-top:24px">
          ${sectionHead('Posts')}
          ${posts.length ? `<div class="stack" style="--gap:12px">${posts.map(postCard).join('')}</div>`
            : `<p class="t-sub" style="margin:0">No posts yet.</p>`}
        </div>` : ''}
    </div>
  </div>`;
}
