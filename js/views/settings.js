import { state, me, notifs } from '../store.js';
import { USERS } from '../data/people.js';
import { esc } from '../util.js';
import { ico } from '../icons.js';
import { avatar, empty } from '../ui/parts.js';

const row = (icon, label, { sub, value, act = '', data = '', danger, toggle, key } = {}) => `
  <button class="row-btn press-sm" ${act ? `data-act="${act}"` : ''} ${data}
    ${toggle ? `role="switch" aria-checked="${state.notif[key] ?? state[key] ? 'true' : 'false'}"` : ''}>
    ${icon ? `<span style="width:32px;height:32px;flex:none;border-radius:9px;display:grid;place-items:center;
      background:rgba(244,241,236,.07);color:${danger ? 'var(--ember)' : 'var(--bone)'}">${ico(icon, 16)}</span>` : ''}
    <span style="flex:1;min-width:0">
      <span class="t-head" style="font-size:14.5px;display:block;${danger ? 'color:var(--ember)' : ''}">${esc(label)}</span>
      ${sub ? `<span class="t-sub" style="font-size:12px">${esc(sub)}</span>` : ''}
    </span>
    ${toggle
      ? `<span class="tgl" aria-hidden="true" ${(state.notif[key] ?? state[key]) ? 'aria-checked="true"' : ''}></span>`
      : value !== undefined
        ? `<span class="t-sub" style="font-size:13px">${esc(value)}</span><span style="color:var(--ash)">${ico('fwd', 16)}</span>`
        : `<span style="color:var(--ash)">${ico('fwd', 16)}</span>`}
  </button>`;

const group = (title, rows) => `
  <div style="margin-bottom:22px">
    ${title ? `<div class="label">${esc(title)}</div>` : ''}
    <div class="list glass">${rows}</div>
  </div>`;

export const SETTINGS_TITLE = {
  root:'Settings', Account:'Account', Notifications:'Notifications',
  Privacy:'Privacy & safety', Blocked:'Blocked', Muted:'Muted',
  Payment:'Payment', Membership:'Membership', Appearance:'Appearance',
  Help:'Help', Guidelines:'Guidelines', Terms:'Legal', About:'About',
};

export const SETTINGS_PARENT = {
  Account:'root', Notifications:'root', Privacy:'root', Appearance:'root',
  Payment:'root', Membership:'root', Help:'root', About:'root', Terms:'root',
  Blocked:'Privacy', Muted:'Privacy', Guidelines:'Privacy',
};

export function settingsView({ key }) {
  const k = key || 'root';
  const u = USERS[me];

  if (k === 'root') return `
    <div class="pad" style="padding-top:calc(max(var(--top),12px) + 58px)">
      <h1 class="t-display" style="margin:0 0 20px">Settings</h1>

      <button class="row press-sm" data-act="set" data-key="Account"
        style="width:100%;gap:13px;padding:13px;border-radius:var(--r-md);margin-bottom:22px;
               background:rgba(244,241,236,.05);border:1px solid var(--hair);text-align:left">
        ${avatar(me, 52)}
        <span style="flex:1;min-width:0">
          <span class="t-head" style="display:block">${esc(u.name)}</span>
          <span class="t-sub" style="font-size:12.5px">@${esc(u.handle)} · Edit your profile</span>
        </span>
        <span style="color:var(--ash)">${ico('fwd', 17)}</span>
      </button>

      ${group('', 
        row('user', 'Account', { act:'set', data:'data-key="Account"' }) +
        row('bell', 'Notifications', { act:'set', data:'data-key="Notifications"' }) +
        row('lock', 'Privacy & safety', { act:'set', data:'data-key="Privacy"' }) +
        row('card', 'Payment methods', { act:'set', data:'data-key="Payment"' })
      )}

      ${group('', 
        row('diamond', 'Membership', { sub: state.member ? 'Active · $12/mo' : 'Not a member',
          act: state.member ? 'set' : 'premium', data:'data-key="Membership"' }) +
        row('eye', 'Appearance', { value:'Dark', act:'set', data:'data-key="Appearance"' })
      )}

      ${group('',
        row('info', 'Help & support', { act:'set', data:'data-key="Help"' }) +
        row('shield', 'Terms & privacy', { act:'set', data:'data-key="Terms"' }) +
        row('sparkle', 'About Went To Event', { act:'set', data:'data-key="About"' })
      )}

      ${group('',
        row('refresh', 'Reset this preview', { sub:'Clears saved events, tickets and posts', act:'reset' }) +
        row('logout', 'Log out', { act:'toast', data:'data-msg="Sign-out is stubbed in this preview"', danger:true })
      )}

      <div style="text-align:center;padding:10px 0 20px">
        <div class="t-sub" style="font-size:11px">Went To Event · preview build</div>
      </div>
    </div>`;

  const pages = {
    Account: () => `
      ${group('Profile',
        row('user', 'Name', { value:u.name, act:'toast', data:'data-msg="Editing is stubbed in this preview"' }) +
        row('sparkle', 'Username', { value:'@' + u.handle, act:'toast', data:'data-msg="Editing is stubbed in this preview"' }) +
        row('chat', 'Bio', { sub:u.bio, act:'toast', data:'data-msg="Editing is stubbed in this preview"' }) +
        row('camera', 'Photo', { act:'toast', data:'data-msg="Editing is stubbed in this preview"' })
      )}
      ${group('Account',
        row('globe', 'Home city', { value: 'Change', act:'picker' }) +
        row('lock', 'Private account', { toggle:true, key:'privateAcct', act:'toggle', data:'data-key="privateAcct"' })
      )}
      ${group('',
        row('trash', 'Delete account', { act:'toast', data:'data-msg="Account deletion requested — check your email"', danger:true })
      )}`,

    Notifications: () => `
      ${group('Push',
        row('bell', 'Events starting soon', { sub:'3 hours before doors', toggle:true, key:'starting', act:'notif', data:'data-key="starting"' }) +
        row('users', 'Friends going', { sub:'When someone you follow joins', toggle:true, key:'friends', act:'notif', data:'data-key="friends"' }) +
        row('sparkle', 'New from hosts you follow', { toggle:true, key:'hosts', act:'notif', data:'data-key="hosts"' }) +
        row('chat', 'Messages', { toggle:true, key:'messages', act:'notif', data:'data-key="messages"' }) +
        row('diamond', 'Members-only drops', { toggle:true, key:'drops', act:'notif', data:'data-key="drops"' })
      )}
      ${group('In app',
        row('wave', 'Haptics', { sub:'A short tap on meaningful actions', toggle:true, key:'haptics', act:'toggle', data:'data-key="haptics"' })
      )}`,

    Privacy: () => `
      ${group('Who can see you',
        row('lock', 'Private account', { sub:'Only approved followers see your posts', toggle:true, key:'privateAcct', act:'toggle', data:'data-key="privateAcct"' }) +
        row('eye', 'Show me on events I join', { sub:'Friends can see you are going', toggle:true, key:'sound', act:'toggle', data:'data-key="sound"' })
      )}
      ${group('People',
        row('shield', 'Blocked accounts', { value:String(Object.keys(state.blocked).length), act:'set', data:'data-key="Blocked"' }) +
        row('mute', 'Muted accounts', { value:String(Object.keys(state.muted).length), act:'set', data:'data-key="Muted"' }) +
        row('flag', 'Community guidelines', { act:'set', data:'data-key="Guidelines"' })
      )}`,

    Blocked: () => {
      const keys = Object.keys(state.blocked);
      return keys.length
        ? group('', keys.map(k => `<div class="row" style="padding:11px 13px;gap:11px">
            ${avatar(k, 40)}
            <span style="flex:1;min-width:0">
              <span class="t-head" style="font-size:14px;display:block">${esc(USERS[k].name)}</span>
              <span class="t-sub" style="font-size:12px">@${esc(USERS[k].handle)}</span></span>
            <button class="pill press" data-act="unblock" data-key="${k}">Unblock</button>
          </div>`).join(''))
        : empty('shield', 'Nobody blocked', 'Accounts you block cannot message you or see what you post.');
    },

    Muted: () => {
      const keys = Object.keys(state.muted);
      return keys.length
        ? group('', keys.map(k => `<div class="row" style="padding:11px 13px;gap:11px">
            ${avatar(k, 40)}
            <span style="flex:1;min-width:0">
              <span class="t-head" style="font-size:14px;display:block">${esc(USERS[k].name)}</span>
              <span class="t-sub" style="font-size:12px">@${esc(USERS[k].handle)}</span></span>
            <button class="pill press" data-act="unmute" data-key="${k}">Unmute</button>
          </div>`).join(''))
        : empty('mute', 'Nobody muted', 'Muting hides someone’s posts without them knowing.');
    },

    Payment: () => `
      ${group('Saved methods',
        row('apple', 'Apple Pay', { sub:'Face ID', value:'Default' }) +
        row('card', 'Visa •••• 4242', { sub:'Expires 06/29' }) +
        row('wallet', 'WTE Balance', { sub:'$40.00 available' })
      )}
      ${group('', row('plus', 'Add a payment method', { act:'toast', data:'data-msg="Adding cards is stubbed in this preview"' }))}`,

    Membership: () => `
      ${group('Your membership',
        row('diamond', 'Status', { value: state.member ? 'Active' : 'Inactive' }) +
        row('cal', 'Renews', { value: state.member ? '5 Oct 2026' : '—' }) +
        row('wallet', 'Price', { value:'$12 / month' })
      )}
      ${state.member ? group('', row('close', 'Cancel membership', { act:'cancelmember', danger:true })) : ''}`,

    Appearance: () => `
      ${group('Theme',
        row('eye', 'Dark', { value:'On', sub:'Went To Event is designed dark — Ink is 70% of the brand' })
      )}
      ${group('Motion',
        row('wave', 'Reduce motion', { sub:'Follows your system setting automatically' })
      )}`,

    Help: () => `
      ${group('', 
        row('info', 'How ticketing works', { act:'toast', data:'data-msg="Help centre is stubbed in this preview"' }) +
        row('wallet', 'Refunds & transfers', { act:'toast', data:'data-msg="Help centre is stubbed in this preview"' }) +
        row('shield', 'Report a problem', { act:'toast', data:'data-msg="Help centre is stubbed in this preview"' }) +
        row('chat', 'Contact support', { act:'toast', data:'data-msg="Help centre is stubbed in this preview"' })
      )}`,

    Guidelines: () => `
      <div class="glass" style="padding:18px;border-radius:var(--r-md)">
        <p class="t-body" style="margin:0 0 14px">Went To Event works because people show up as themselves.
          Three rules carry most of it:</p>
        ${[['Be real', 'One account, your own name, photos you took.'],
           ['Host honestly', 'The event has to be what the listing says it is. Price, place, time.'],
           ['Leave people alone', 'No harassment, no unwanted contact after someone stops replying.']]
          .map(([t, s]) => `<div style="margin-bottom:13px">
            <div class="t-head" style="font-size:14px;margin-bottom:2px">${t}</div>
            <div class="t-sub" style="font-size:13px">${s}</div></div>`).join('')}
        <p class="t-sub" style="margin:0;font-size:12.5px">Reports are reviewed within 24 hours.</p>
      </div>`,

    Terms: () => `
      ${group('', 
        row('shield', 'Terms of service', { act:'toast', data:'data-msg="Legal copy is placeholder in this preview"' }) +
        row('lock', 'Privacy policy', { act:'toast', data:'data-msg="Legal copy is placeholder in this preview"' }) +
        row('info', 'Cookie settings', { act:'toast', data:'data-msg="Legal copy is placeholder in this preview"' })
      )}`,

    About: () => `
      <div class="glass" style="padding:22px;border-radius:var(--r-md);text-align:center">
        <div style="display:flex;justify-content:center;margin-bottom:14px">
          <img src="assets/icons/e_icon_rounded_512.png" alt="" width="70" height="70" style="border-radius:16px">
        </div>
        <div class="t-title" style="margin-bottom:4px">Went To Event</div>
        <div class="t-sub" style="margin-bottom:16px">Preview build · September 2026</div>
        <p class="t-body ash" style="margin:0 0 16px">Discover events near you, join in two taps, and keep a
          record of the good ones.</p>
        <div class="t-sub" style="font-size:11.5px">Designed and built by Alpha Agency</div>
      </div>`,
  };

  return `
    <div class="pad" style="padding-top:calc(max(var(--top),12px) + 58px)">
      <h1 class="t-display" style="margin:0 0 20px">${esc(SETTINGS_TITLE[k] || k)}</h1>
      ${(pages[k] || (() => empty('info', 'Nothing here', 'This section is a stub in the preview.')))()}
    </div>`;
}

export function premiumView() {
  const perks = [
    ['ticket',  'No booking fees',        'On every ticket, every time. Pays for itself in two nights out.'],
    ['diamond', 'Members-only events',    'Rooftop tables, supper clubs and rooms that never go on general sale.'],
    ['bolt',    'Early access',           'Twenty-four hours before tickets open to everyone else.'],
    ['sparkle', 'City Concierge',         'A short, human-picked plan for your weekend, wherever you are.'],
    ['checkcirc','A verified badge',      'So hosts know you show up.'],
  ];
  return `
  <div>
    <div style="position:relative;padding:calc(max(var(--top),12px) + 68px) 22px 32px;text-align:center;overflow:hidden">
      <div style="position:absolute;inset:0;background:
        radial-gradient(80% 60% at 50% 0%,rgba(201,168,106,.20),transparent 68%)"></div>
      <div style="position:relative">
        <div style="width:72px;height:72px;margin:0 auto 20px;border-radius:22px;display:grid;place-items:center;
             background:rgba(201,168,106,.16);border:1px solid rgba(201,168,106,.32);color:var(--gold)">
          ${ico('diamond', 34)}
        </div>
        <h1 class="t-display" style="margin:0 0 10px">${state.member ? 'You’re a member.' : 'Went To Event, membership.'}</h1>
        <p class="t-body ash" style="margin:0 auto;max-width:300px">
          ${state.member
            ? 'Booking fees are off, members-only nights are unlocked and your badge is live.'
            : 'One price. No booking fees, and the rooms that never make it to general sale.'}
        </p>
      </div>
    </div>

    <div class="pad">
      <div class="stack" style="--gap:10px">
        ${perks.map(([i, t, s]) => `
          <div class="row" style="gap:13px;padding:14px;border-radius:var(--r-md);
               background:rgba(244,241,236,.045);border:1px solid var(--hair)">
            <span style="width:38px;height:38px;flex:none;border-radius:11px;display:grid;place-items:center;
                  background:rgba(201,168,106,.14);color:var(--gold)">${ico(i, 18)}</span>
            <span style="flex:1">
              <span class="t-head" style="font-size:14.5px;display:block;margin-bottom:2px">${t}</span>
              <span class="t-sub" style="font-size:12.5px">${s}</span>
            </span>
          </div>`).join('')}
      </div>

      ${state.member ? `
        <button class="row press-sm" data-act="cancelmember" style="width:100%;margin-top:20px;justify-content:center;
          padding:13px;color:var(--ash);font-size:13px">Cancel membership</button>` : ''}
    </div>
  </div>`;
}

export const premiumDock = () => state.member ? '' : `
  <button class="btn btn-gold press" data-act="subscribe">Become a member · $12/mo</button>
  <div class="dock-note">Cancel anytime. Auto-renews monthly until cancelled.</div>`;

export function notificationsView() {
  return `
  <div class="pad" style="padding-top:calc(max(var(--top),12px) + 58px)">
    <h1 class="t-display" style="margin:0 0 18px">Notifications</h1>
    ${notifs.length ? `<div class="stack" style="--gap:3px">${notifs.map(notifRow).join('')}</div>`
      : empty('bell', 'All caught up', 'Nothing new right now.')}
  </div>`;
}

function notifRow(n) {
  const go = n.go
    ? (n.go.to === 'event' ? `data-act="event" data-id="${n.go.id}"`
      : n.go.to === 'user' ? `data-act="user" data-key="${n.go.key}"`
      : n.go.to === 'thread' ? `data-act="thread" data-key="${n.go.key}"`
      : n.go.to === 'premium' ? 'data-act="premium"'
      : 'data-act="tab" data-tab="profile"')
    : '';
  return `<button class="row press-sm" ${go}
    style="width:100%;gap:12px;padding:12px 10px;border-radius:var(--r-md);text-align:left;
           background:${n.unread ? 'rgba(255,91,61,.05)' : 'transparent'}">
    ${n.user ? avatar(n.user, 42) : `
      <span style="width:42px;height:42px;flex:none;border-radius:var(--r-full);display:grid;place-items:center;
        background:rgba(244,241,236,.07);color:var(--bone)">${ico(n.ic, 18)}</span>`}
    <span style="flex:1;min-width:0">
      <span class="t-body" style="font-size:14px;display:block;line-height:1.4">
        ${n.user ? `<b style="font-weight:660">${esc(USERS[n.user].name)}</b> ` : ''}${esc(n.text)}</span>
      <span class="t-sub" style="font-size:11.5px">${esc(n.ago)}</span>
    </span>
    ${n.unread ? `<i style="width:8px;height:8px;border-radius:50%;background:var(--ember);flex:none"></i>` : ''}
  </button>`;
}
