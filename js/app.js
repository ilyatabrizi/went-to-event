import { state, load, save, convos, notifs, convoOf, unreadChats, unreadNotifs,
         toggleSave, isSaved, me, reset } from './store.js';
import { byId, addEvent, nextId, eventsForCity } from './data/events.js';
import { USERS, POSTS } from './data/people.js';
import { COUNTRIES, catLabel } from './data/geo.js';
import { esc, money, amount, clamp, hashStr, rng, pick } from './util.js';
import { ico } from './icons.js';
import { Router } from './router.js';
import { Animatable, SPRING } from './ui/motion.js';
import { initSheets, openSheet, closeSheet, sheetOpen } from './ui/sheet.js';
import { initToast, toast } from './ui/toast.js';
import * as hap from './ui/haptics.js';
import { setHaptics } from './ui/haptics.js';

import { homeView, cityName, cityEvents } from './views/home.js';
import { discoverView, discoverBody } from './views/discover.js';
import { openLocationPicker, openFilterSheet } from './views/pickers.js';
import { detailView, detailDock } from './views/detail.js';
import { bookingView, bookingDock, checkoutView, checkoutDock,
         confirmView, confirmDock, curTier } from './views/booking.js';
import { ticketsView, ticketView } from './views/tickets.js';
import { chatView, threadView, threadDock } from './views/chat.js';
import { profileView, userProfileView } from './views/profile.js';
import { settingsView, premiumView, premiumDock, notificationsView,
         SETTINGS_TITLE } from './views/settings.js';
import { createView, createDock, publishedView, publishedDock, blankDraft, stepValid, STEPS } from './views/create.js';

/* ---------------------------------------------------------------- refs */
const $ = s => document.querySelector(s);
const app = $('#app'), tabbar = $('#tabbar'), topbar = $('#topbar');
const tabPill = $('#tabPill'), boot = $('#boot');
initSheets($('#sheetRoot'));
initToast($('#toastDock'));

const TABS = [
  { key:'home',     label:'Home',     icon:'home'    },
  { key:'discover', label:'Discover', icon:'compass' },
  { key:'chat',     label:'Chat',     icon:'chat'    },
  { key:'tickets',  label:'Tickets',  icon:'ticket'  },
  { key:'profile',  label:'You',      icon:'user'    },
];

/* Screens that own the bottom dock instead of the tab bar. */
const DOCKS = {
  detail: detailDock, booking: bookingDock, checkout: checkoutDock,
  confirm: confirmDock, ticket: () => '', premium: premiumDock,
  create: createDock, published: publishedDock, thread: threadDock,
};
const TITLES = {
  detail:'', booking:'Choose tickets', checkout:'Checkout', confirm:'',
  ticket:'Your ticket', premium:'Membership', create:'Publish an event',
  published:'', settings:'Settings', notifications:'Notifications',
  thread:'', userprofile:'',
};

load();
setHaptics(state.haptics);

/* ---------------------------------------------------------------- router */
const router = new Router(app, { onChange: sync });

const VIEWS = {
  home: homeView, discover: discoverView, chat: chatView,
  tickets: ticketsView, profile: profileView,
  detail: detailView, booking: bookingView, checkout: checkoutView,
  confirm: confirmView, ticket: ticketView, thread: threadView,
  userprofile: userProfileView, settings: settingsView,
  premium: premiumView, notifications: notificationsView,
  create: createView, published: publishedView,
};
const go = (name, params = {}) => router.push(name, VIEWS[name], params);

function setTab(key) {
  state.tab = key;
  router.setRoot(key, VIEWS[key], {});
  save();
}

/* ---------------------------------------------------------------- chrome */
function buildTabs() {
  tabbar.innerHTML = '<div class="tab-pill" id="tabPill" aria-hidden="true"></div>' +
    TABS.map(t => {
      const badge = t.key === 'chat' ? unreadChats() : 0;
      return `<button class="tab press" role="tab" data-tab="${t.key}"
        aria-selected="${state.tab === t.key ? 'true' : 'false'}" aria-label="${t.label}">
        ${ico(t.icon, 22, 'ti')}<span class="tl">${t.label}</span>
        ${badge ? '<i class="tab-dot"></i>' : ''}
      </button>`;
    }).join('');
}

let pillX = null;
function movePill(animate = true) {
  const pill = tabbar.querySelector('.tab-pill');
  const active = tabbar.querySelector(`[data-tab="${state.tab}"]`);
  if (!pill || !active) return;
  const r = active.getBoundingClientRect(), pr = tabbar.getBoundingClientRect();
  const x = r.left - pr.left, w = r.width;
  pill.style.width = w + 'px';
  if (!pillX || !animate) { pill.style.transform = `translate3d(${x}px,0,0)`; pillX = new Animatable(x, v => {
      pill.style.transform = `translate3d(${v}px,0,0)`; }); return; }
  pillX.to(x, SPRING.snap);
}

function sync() {
  const top = router.top;
  if (!top) return;
  const name = top.name;
  const isTab = TABS.some(t => t.key === name);

  /* chrome */
  buildTabs();
  tabbar.classList.toggle('hide', !isTab);
  requestAnimationFrame(() => movePill(false));

  const dock = $('#dock');
  const dockHTML = DOCKS[name] ? DOCKS[name](top.params) : '';
  dock.innerHTML = dockHTML;
  dock.hidden = !dockHTML;

  /* bottom padding must clear whatever is actually floating down there */
  const pad = isTab ? 'var(--dock)' : (dockHTML ? 'calc(max(var(--bot),10px) + 78px)' : 'calc(max(var(--bot),10px) + 16px)');
  top.node.style.setProperty('--pad-bot', pad);

  /* top bar — only screens pushed on the stack get one */
  const title = name === 'settings'
    ? (SETTINGS_TITLE[top.params.key || 'root'] || 'Settings')
    : TITLES[name];
  const wantsBar = !isTab && name !== 'detail' && name !== 'userprofile' && name !== 'profile';
  topbar.classList.toggle('on', wantsBar);
  if (wantsBar) {
    topbar.innerHTML =
      `<button class="gbtn press" data-act="back" aria-label="Back">${ico('back', 19)}</button>
       <div class="topbar-title">${esc(title || '')}</div>
       <div style="width:36px;flex:none"></div>`;
  }
  if (name === 'thread' && top.params.key) {
    const u = USERS[top.params.key];
    topbar.classList.add('on');
    topbar.innerHTML =
      `<button class="gbtn press" data-act="back" aria-label="Back">${ico('back', 19)}</button>
       <button class="row press" data-act="user" data-key="${top.params.key}"
         style="flex:1;gap:9px;justify-content:center">
         <span class="topbar-title" style="flex:none">${esc(u.name)}</span></button>
       <button class="gbtn press" data-act="more" data-mtype="user" data-key="${top.params.key}"
         aria-label="More">${ico('more', 18)}</button>`;
  }

  afterRender(name, top.params);
}

/* ---------------------------------------------------------------- after render */
function afterRender(name, params) {
  lazyImages();
  segPills();

  if (name === 'thread') {
    app.scrollTop = app.scrollHeight;
  }
  if (name === 'discover' && state._focusSearch) {
    state._focusSearch = false;
    const i = $('#searchInput');
    if (i) { i.focus(); const v = i.value; i.value = ''; i.value = v; }
  }
  if (name === 'confirm') {
    const mark = $('#confirmMark');
    if (mark) {
      const a = new Animatable(0, v => {
        mark.style.transform = `scale(${0.5 + v * 0.5})`;
        mark.style.opacity = String(Math.min(1, v * 1.4));
      });
      requestAnimationFrame(() => a.to(1, SPRING.flick));
    }
  }
}

/* Images fade in only once decoded, so a card never flashes a half-painted
   photo over its gradient. */
function lazyImages() {
  app.querySelectorAll('img[data-lazy]').forEach(img => {
    img.removeAttribute('data-lazy');
    img.loading = 'lazy'; img.decoding = 'async';
    const show = () => img.classList.add('in');
    if (img.complete && img.naturalWidth) show();
    else { img.addEventListener('load', show, { once: true });
           img.addEventListener('error', () => img.remove(), { once: true }); }
  });
}

/* Segmented controls animate their own pill; they are used on three screens. */
function segPills() {
  app.querySelectorAll('.seg').forEach(seg => {
    if (seg._wired) return;
    seg._wired = true;
    const pill = seg.querySelector('.seg-pill');
    const place = (animate) => {
      const on = seg.querySelector('[aria-selected="true"]');
      if (!on || !pill) return;
      const r = on.getBoundingClientRect(), sr = seg.getBoundingClientRect();
      pill.style.width = r.width + 'px';
      const x = r.left - sr.left;
      if (!seg._x || !animate) { pill.style.transform = `translate3d(${x}px,0,0)`;
        seg._x = new Animatable(x, v => { pill.style.transform = `translate3d(${v}px,0,0)`; }); }
      else seg._x.to(x, SPRING.snap);
    };
    requestAnimationFrame(() => place(false));
    seg.addEventListener('click', e => {
      const b = e.target.closest('[data-segkey]');
      if (!b) return;
      seg.querySelectorAll('[data-segkey]').forEach(x =>
        x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
      place(true);
      hap.tap();
      onSegChange(seg.dataset.seg, b.dataset.segkey);
    });
  });
}

function onSegChange(id, key) {
  if (id === 'homefeed')   { state.homeFeed = key; save(); softRefresh(); }
  if (id === 'tickettab')  { state.ticketTab = key; softRefresh(); }
  if (id === 'profiletab') { state.profileTab = key; softRefresh(); }
}

/* Re-render the current screen without losing scroll — the seg pill has
   already moved, so the switch feels instant and the content catches up. */
let refreshT = 0;
function softRefresh() {
  clearTimeout(refreshT);
  refreshT = setTimeout(() => { router.refresh(); }, 10);
}

/* ---------------------------------------------------------------- actions */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act], [data-tab]');
  if (!t) return;

  if (t.dataset.tab && !t.dataset.act) {
    if (state.tab === t.dataset.tab && router.depth === 1) { app.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    hap.tap(); setTab(t.dataset.tab); return;
  }

  const a = t.dataset.act, d = t.dataset;
  switch (a) {

  /* --- navigation --- */
  case 'tab':           hap.tap(); closeSheet(); setTab(d.tab); break;
  case 'back':          hap.tap(); if (!router.pop()) setTab(state.tab); break;
  case 'event':         hap.tap(); state.eventId = +d.id; state.tierIdx = 0; state.qty = 1;
                        go('detail', { id: +d.id }); break;
  case 'user':          hap.tap(); closeSheet(); go('userprofile', { key: d.key }); break;
  case 'thread':        { hap.tap(); closeSheet(); const c = convoOf(d.key); if (c) c.unread = 0;
                        go('thread', { key: d.key }); break; }
  case 'notifications': hap.tap(); notifs.forEach(n => { n.unread = false; });
                        go('notifications'); break;
  case 'settings':      hap.tap(); go('settings', { key: 'root' }); break;
  case 'set':           hap.tap(); go('settings', { key: d.key }); break;
  case 'premium':       hap.tap(); closeSheet(); go('premium'); break;

  /* --- saving, following --- */
  case 'save': {
    e.stopPropagation();
    const on = toggleSave(+d.id);
    hap.commit();
    const btn = t.closest('.savebtn') || t;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    /* a small pop, so the tap has a body to it */
    const a2 = new Animatable(1, v => { btn.style.transform = `scale(${v})`; });
    a2.set(0.82); a2.to(1, SPRING.flick);
    toast(on ? 'Saved' : 'Removed from saved', on ? 'bookmark' : 'close');
    break;
  }
  case 'followhost': {
    const h = d.host;
    state.followingHosts[h] = !state.followingHosts[h];
    save(); hap.commit();
    toast(state.followingHosts[h] ? `Following ${h}` : `Unfollowed ${h}`, 'checkcirc');
    router.refresh(); break;
  }
  case 'followuser': {
    const k = d.key;
    state.followingUsers[k] = !state.followingUsers[k];
    save(); hap.commit();
    toast(state.followingUsers[k] ? `Following ${USERS[k].name}` : 'Unfollowed', 'checkcirc');
    router.refresh(); break;
  }

  /* --- discovery --- */
  case 'picker':
    hap.tap();
    openLocationPicker({ onPick: () => {
      toast(`${state.visiting ? 'Visiting' : 'Now exploring'} ${cityName()}`, 'pin');
      setTab('home');
    }});
    break;
  case 'filter:open':
    hap.tap();
    openFilterSheet({ onApply: () => patchDiscover() });
    break;
  case 'filter:clear':
    state.whenIdx = state.priceIdx = state.sortIdx = 0; state.cat = null; state.query = '';
    router.refresh(); break;
  case 'cat':
    hap.tap(); state.cat = d.cat; state.query = '';
    if (router.top.name !== 'discover') setTab('discover'); else router.refresh();
    break;
  case 'cat:clear':     state.cat = null; router.refresh(); break;
  case 'search:clear':  { state.query = ''; const i = $('#searchInput');
                        if (i) { i.value = ''; i.focus(); } patchDiscover();
                        const c = t.closest('.field').querySelector('[data-act="search:clear"]');
                        if (c) c.style.display = 'none'; break; }

  /* --- booking --- */
  case 'book':      hap.tap(); state.tierIdx = 0; state.qty = 1; go('booking'); break;
  case 'tier':      state.tierIdx = +d.idx; hap.tap(); router.refresh(); break;
  case 'qty':       state.qty = clamp(state.qty + (+d.d), 1, 10); hap.tap(); router.refresh(); break;
  case 'method':    state.methodIdx = +d.idx; hap.tap(); router.refresh(); break;
  case 'tocheckout':hap.tap(); go('checkout'); break;
  case 'pay': {
    const ev = byId(state.eventId);
    state.myTickets.unshift({ eventId: ev.id, tier: state.tierIdx, qty: state.qty, past: false });
    save(); hap.success();
    go('confirm'); break;
  }
  case 'viewticket': hap.tap(); router.popTo(state.tab); go('ticket', { idx: 0 }); break;
  case 'ticket':     hap.tap(); go('ticket', { idx: +d.idx }); break;

  /* --- publishing --- */
  case 'create':
    hap.tap(); state.create = blankDraft(); go('create'); break;
  case 'c:cat':   state.create.cat = d.cat; hap.tap(); router.refresh(); break;
  case 'c:date':  state.create.date = d.v; hap.tap(); router.refresh(); break;
  case 'c:time':  state.create.time = d.v; hap.tap(); router.refresh(); break;
  case 'c:free':  state.create.paid = false; hap.tap(); router.refresh(); break;
  case 'c:paid':  state.create.paid = true; hap.tap(); router.refresh(); break;
  case 'c:next':
    if (!stepValid(state.create)) { hap.warn(); toast('Fill this in first', 'info'); break; }
    state.create.step = Math.min(STEPS.length - 1, state.create.step + 1);
    hap.tap(); router.refresh(); break;
  case 'c:back':
    state.create.step = Math.max(0, state.create.step - 1); hap.tap(); router.refresh(); break;
  case 'c:publish': publish(); break;
  case 'viewpublished':
    state.eventId = state.publishedId;
    router.popTo(state.tab);
    go('detail', { id: state.publishedId });
    break;

  /* --- social --- */
  case 'compose':      hap.tap(); composeMessageSheet(); break;
  case 'compose:post': hap.tap(); composePostSheet(); break;
  case 'send':         sendMessage(); break;
  case 'like':         hap.tap(); toast('Liked', 'heart'); break;
  case 'share':        hap.tap(); shareCurrent(); break;
  case 'more':         hap.tap(); moreSheet(d); break;
  case 'mute':         state.muted[d.key] = true; save(); closeSheet(); hap.commit();
                       toast(`Muted @${USERS[d.key].handle}`, 'mute'); router.refresh(); break;
  case 'unmute':       delete state.muted[d.key]; save(); hap.commit(); toast('Unmuted'); router.refresh(); break;
  case 'block':        state.blocked[d.key] = true; state.muted[d.key] = true; save(); closeSheet();
                       hap.warn(); toast(`Blocked @${USERS[d.key].handle}`, 'shield'); router.refresh(); break;
  case 'unblock':      delete state.blocked[d.key]; delete state.muted[d.key]; save(); hap.commit();
                       toast('Unblocked'); router.refresh(); break;
  case 'report:open':  hap.tap(); reportSheet(d); break;
  case 'report:send':  closeSheet(); hap.commit();
                       toast('Report received — we review within 24 hours', 'shield'); break;
  case 'delpost':      state.posts = state.posts.filter(p => p.id !== d.id); save(); closeSheet();
                       hap.commit(); toast('Post deleted', 'trash'); router.refresh(); break;

  /* --- settings --- */
  case 'toggle':  state[d.key] = !state[d.key];
                  if (d.key === 'haptics') setHaptics(state.haptics);
                  save(); hap.tap(); router.refresh(); break;
  case 'notif':   state.notif[d.key] = !state.notif[d.key]; save(); hap.tap(); router.refresh(); break;
  case 'subscribe':
    state.member = true; save(); hap.success();
    router.refreshBelow();          // the profile you land on already shows the badge
    router.pop();
    toast('Welcome to membership — you’re verified', 'diamond');
    break;
  case 'cancelmember':
    state.member = false; save(); hap.warn(); toast('Membership cancelled'); router.refresh(); break;
  case 'reset':
    openSheet({ title:'Reset this preview?', id:'reset',
      body:`<p class="t-body ash" style="margin:0 0 6px">This clears your saved events, tickets, posts and
             membership, and reloads the app as a first-time visitor. Nothing leaves this device.</p>`,
      foot:`<div class="dock-row">
        <button class="btn btn-ghost press" data-sheet-close style="flex:1">Keep it</button>
        <button class="btn btn-ember press" data-act="reset:do" style="flex:1">Reset</button></div>` });
    break;
  case 'reset:do': reset(); break;

  case 'toast':   hap.tap(); toast(d.msg || 'Noted'); break;
  }
});

/* ---------------------------------------------------------------- inputs */
document.addEventListener('input', e => {
  const k = e.target.dataset.input;
  if (!k) return;
  if (k === 'search') {
    state.query = e.target.value;
    patchDiscover();
    const c = e.target.closest('.field').querySelector('[data-act="search:clear"]');
    if (c) c.style.display = e.target.value ? 'flex' : 'none';
  } else if (k === 'chatsearch') {
    const q = e.target.value.trim().toLowerCase();
    $('#chatList').querySelectorAll('[data-search]').forEach(r => {
      r.style.display = !q || r.dataset.search.includes(q) ? '' : 'none';
    });
  } else if (k === 'comp') {
    state.composeText = e.target.value;
    const b = document.querySelector('[data-act="post:send"]');
    if (b) b.disabled = !e.target.value.trim();
  } else if (k.startsWith('c_')) {
    const f = { c_title:'title', c_about:'about', c_date:'date', c_time:'time',
                c_venue:'venue', c_price:'price' }[k];
    if (f) {
      state.create[f] = e.target.value;
      const btn = document.querySelector('#dock [data-act="c:next"], #dock [data-act="c:publish"]');
      if (btn) btn.disabled = !stepValid(state.create);
      /* Patch the pieces that depend on this field rather than re-rendering —
         a re-render here would blur the input on every keystroke. */
      if (f === 'title') {
        const c = $('#titleCount');
        if (c) c.textContent = `${e.target.value.length}/60`;
      }
      if (f === 'price') {
        const n = parseFloat(e.target.value) || 0;
        const pay = $('#payoutValue'), pv = $('#previewPrice');
        if (pay) pay.textContent = amount(Math.max(0, n * 0.94));
        if (pv) pv.textContent = money(state.create.paid ? n : 0);
      }
    }
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'msgInput') { e.preventDefault(); sendMessage(); }
  if (e.key === 'Escape') { if (!closeSheet()) router.pop(); }
});

/* Only the results list re-renders while typing — re-rendering the screen
   would blur the input on every keystroke. */
function patchDiscover() {
  const b = $('#discoverBody');
  if (b) { b.innerHTML = discoverBody(); lazyImages(); }
}

/* ---------------------------------------------------------------- flows */
function publish() {
  const c = state.create;
  const price = c.paid ? (parseFloat(c.price) || 0) : 0;
  const id = nextId();
  addEvent({
    id, cat: c.cat, title: c.title.trim() || 'Untitled event',
    host: USERS[me].name, hostEvents: 1, userMade: true,
    when: (c.date || 'Soon') + (c.time ? ' · ' + c.time : ''),
    dateLong: c.date || 'Date to be confirmed', timeRange: c.time || 'Time TBC',
    venue: c.venue.trim() || 'Venue TBC', address: (c.venue || 'Venue TBC') + ' · ' + c.city,
    dist: 0.4, going: 1, friends: [], member: false,
    about: c.about.trim() || 'A new event on Went To Event.',
    tiers: c.paid ? [{ name:'General', desc:'Standard entry', price }]
                  : [{ name:'RSVP', desc:'Free entry', price: 0 }],
  }, c.city);
  state.publishedId = id;
  state.eventId = id;
  hap.success();
  router.popTo(state.tab);
  go('published');
}

function sendMessage() {
  const i = $('#msgInput');
  if (!i) return;
  const v = i.value.trim();
  if (!v) return;
  const key = router.top.params.key;
  let c = convoOf(key);
  if (!c) { c = { user: key, ago:'now', unread:0, msgs:[] }; convos.unshift(c); }
  c.msgs.push({ f:'me', t:v, w:'now' });
  c.ago = 'now';
  i.value = '';
  hap.tap();
  router.refresh();

  /* they are typing, then they answer — a demo that answers instantly reads
     as a script; a beat of delay reads as a person. */
  setTimeout(() => {
    const typing = $('#typing');
    if (typing && router.top.name === 'thread') { typing.hidden = false; app.scrollTop = app.scrollHeight; }
  }, 420);
  setTimeout(() => {
    if (router.top.name !== 'thread' || router.top.params.key !== key) return;
    if (state.blocked[key]) return;
    const r = rng(hashStr(v + c.msgs.length));
    c.msgs.push({ f:'them', w:'now', t: pick(r, [
      'see you there', 'love that', 'count me in', 'haha yes',
      'on my way soon', 'perfect', 'sounds good', 'saved it already',
    ])});
    router.refresh();
  }, 1500);
}

function shareCurrent() {
  const name = router.top.name;
  const ev = (name === 'detail' || name === 'ticket') ? byId(state.eventId) : null;
  const url = location.href.split('#')[0];
  const data = ev
    ? { title: ev.title, text: `${ev.title} — ${ev.when} at ${ev.venue}`, url }
    : { title: 'Went To Event', text: 'Discover events near you.', url };
  if (navigator.share) {
    navigator.share(data).then(() => hap.commit()).catch(() => {});
  } else {
    navigator.clipboard?.writeText(`${data.text} ${url}`).then(
      () => toast('Link copied', 'share'), () => toast('Could not copy'));
  }
}

/* ---------------------------------------------------------------- sheets */
function moreSheet(d) {
  const isPost = d.mtype === 'post';
  const key = d.key;
  const mine = key === me;
  const opt = (icon, label, act, data = '', danger) => `
    <button class="row-btn press-sm" data-act="${act}" ${data}>
      <span style="width:32px;height:32px;flex:none;border-radius:9px;display:grid;place-items:center;
        background:rgba(244,241,236,.07);color:${danger ? 'var(--ember)' : 'var(--bone)'}">${ico(icon, 16)}</span>
      <span class="t-head" style="font-size:14.5px;flex:1;${danger ? 'color:var(--ember)' : ''}">${label}</span>
    </button>`;

  const body = `<div class="list glass" style="margin-bottom:14px">
    ${opt('share', 'Share', 'share')}
    ${isPost && mine ? opt('trash', 'Delete post', 'delpost', `data-id="${d.id}"`, true) : ''}
    ${!mine ? opt('user', 'View profile', 'user', `data-key="${key}"`) : ''}
    ${!mine && !state.muted[key] ? opt('mute', `Mute @${USERS[key].handle}`, 'mute', `data-key="${key}"`) : ''}
    ${!mine && state.muted[key] ? opt('mute', 'Unmute', 'unmute', `data-key="${key}"`) : ''}
    ${!mine && !state.blocked[key] ? opt('shield', `Block @${USERS[key].handle}`, 'block', `data-key="${key}"`, true) : ''}
    ${!mine ? opt('flag', 'Report', 'report:open', `data-rtype="${d.mtype}" data-key="${key}" data-id="${d.id || ''}"`, true) : ''}
  </div>`;
  openSheet({ body, id:'more', foot:`<button class="btn btn-ghost press" data-sheet-close>Cancel</button>` });
}

function reportSheet(d) {
  const reasons = ['It’s spam', 'Misleading or a scam', 'Harassment or hate',
                   'Nudity or sexual content', 'Violence or dangerous', 'Something else'];
  const body = `<p class="t-sub" style="margin:0 0 14px">Reports are anonymous. We review every one within
      24 hours and tell you what happened.</p>
    <div class="list glass">
      ${reasons.map(r => `<button class="row-btn press-sm" data-act="report:send">
        <span class="t-head" style="font-size:14.5px;flex:1">${r}</span>
        <span style="color:var(--ash)">${ico('fwd', 16)}</span></button>`).join('')}
    </div>`;
  openSheet({ title:'Report', body, id:'report' });
}

function composeMessageSheet() {
  const people = Object.keys(USERS).filter(k => k !== me && !state.blocked[k]);
  const body = `<div class="stack" style="--gap:2px;padding-bottom:8px">
    ${people.map(k => `<button class="row-btn press-sm" data-act="thread" data-key="${k}">
      <span style="flex:none">${avatarHTML(k)}</span>
      <span style="flex:1;min-width:0">
        <span class="t-head" style="font-size:14.5px;display:block">${esc(USERS[k].name)}</span>
        <span class="t-sub" style="font-size:12px">@${esc(USERS[k].handle)}</span></span>
    </button>`).join('')}
  </div>`;
  openSheet({ title:'New message', body, id:'compose', detents:[0.7] });
}
function avatarHTML(k) {
  const u = USERS[k];
  return `<div class="av" style="width:40px;height:40px;background:${u.bg};font-size:14px">
    <span>${esc(u.initials)}</span><img data-lazy alt="" src="${u.photo}"></div>`;
}

function composePostSheet() {
  state.composeText = '';
  const body = `
    <div class="row" style="gap:11px;align-items:flex-start;margin-bottom:12px">
      ${avatarHTML(me)}
      <div class="field field-area" style="flex:1">
        <textarea data-input="comp" rows="4" maxlength="280" autofocus
          placeholder="Where did you go? What was it like?" aria-label="Write a post"></textarea>
      </div>
    </div>
    <div class="t-sub" style="font-size:11.5px;margin-left:2px">Posts go to your profile and your followers’ feeds.</div>`;
  const foot = `<div class="dock-row">
      <button class="btn btn-ghost press" data-sheet-close style="flex:none;width:104px">Cancel</button>
      <button class="btn press" data-act="post:send" style="flex:1" disabled>Post</button></div>`;
  const inst = openSheet({ title:'New post', body, foot, id:'post' });
  inst.sheet.querySelector('textarea')?.focus();
  inst.sheet.addEventListener('click', e => {
    if (!e.target.closest('[data-act="post:send"]')) return;
    const txt = (state.composeText || '').trim();
    if (!txt) return;
    state.posts.unshift({ id:'u' + nextId(), author:me, ago:'now', text:txt,
                          photo:null, likes:0, replies:0, eventId:null });
    state.profileTab = 'posts';
    save(); closeSheet(); hap.success();
    if (state.tab !== 'profile') setTab('profile'); else router.refresh();
    toast('Posted', 'checkcirc');
  });
}

/* ---------------------------------------------------------------- boot */
function start() {
  setTab(state.tab && VIEWS[state.tab] ? state.tab : 'home');
  window.addEventListener('resize', () => movePill(false));

  const lift = () => {
    boot.classList.add('gone');
    setTimeout(() => boot.remove(), 500);
    state.seenBoot = true; save();
  };
  /* Hold the veil just long enough for the first cards to have decoded, so the
     app never appears mid-paint. Returning visitors get a much shorter hold. */
  setTimeout(lift, state.seenBoot ? 260 : 900);
}

/* Not on localhost: a service worker in front of the dev server means every
   edit is a cache-busting expedition. It earns its place on the deployed site,
   not here. */
const LOCAL = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
if ('serviceWorker' in navigator && !LOCAL && location.protocol === 'https:') {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('sw.js').catch(() => {}));
} else if ('serviceWorker' in navigator && LOCAL) {
  navigator.serviceWorker.getRegistrations()
    .then(rs => rs.forEach(r => r.unregister())).catch(() => {});
}

start();
