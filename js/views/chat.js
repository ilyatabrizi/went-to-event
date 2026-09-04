import { state, convos, convoOf } from '../store.js';
import { USERS } from '../data/people.js';
import { esc } from '../util.js';
import { ico } from '../icons.js';
import { avatar, nameLine, empty, verified } from '../ui/parts.js';

export function chatView() {
  const list = convos.filter(c => !state.blocked[c.user]);
  return `
  <div class="pad" style="padding-top:calc(max(var(--top),12px) + 6px)">
    <div class="row" style="justify-content:space-between;margin-bottom:16px">
      <h1 class="t-display" style="margin:0">Chat</h1>
      <button class="gbtn press" data-act="compose" aria-label="New message">${ico('plus', 19)}</button>
    </div>

    <div class="field" style="margin-bottom:6px">
      ${ico('search', 18)}
      <input data-input="chatsearch" type="search" placeholder="Search messages" autocomplete="off"
        aria-label="Search messages">
    </div>

    <div id="chatList" style="margin-top:10px">
      ${list.length ? list.map(convoRow).join('')
        : empty('chat', 'No messages', 'Message someone you met at an event and it shows up here.')}
    </div>
  </div>`;
}

function convoRow(c) {
  const u = USERS[c.user];
  const last = c.msgs[c.msgs.length - 1];
  const mine = last && last.f === 'me';
  return `<button class="row press-sm" data-act="thread" data-key="${c.user}"
    data-search="${esc((u.name + ' ' + u.handle + ' ' + (last ? last.t : '')).toLowerCase())}"
    style="width:100%;gap:12px;padding:11px 8px;border-radius:var(--r-md);text-align:left">
    <div style="position:relative;flex:none">
      ${avatar(c.user, 50)}
      ${c.unread ? `<i style="position:absolute;top:0;right:0;width:13px;height:13px;border-radius:50%;
         background:var(--ember);box-shadow:0 0 0 2.5px var(--ink)"></i>` : ''}
    </div>
    <div style="flex:1;min-width:0">
      <div class="row" style="gap:5px">
        <span class="t-head" style="font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.name)}</span>
        ${verified(c.user)}
        <span class="t-sub" style="font-size:12px;margin-left:auto;flex:none">${esc(c.ago)}</span>
      </div>
      <div class="t-sub" style="font-size:13.5px;margin-top:1px;overflow:hidden;text-overflow:ellipsis;
           white-space:nowrap;${c.unread ? 'color:var(--bone);font-weight:520' : ''}">
        ${mine ? 'You: ' : ''}${esc(last ? last.t : '')}
      </div>
    </div>
  </button>`;
}

export function threadView({ key }) {
  const u = USERS[key];
  const c = convoOf(key) || { user: key, msgs: [] };
  const blocked = !!state.blocked[key];

  return `
  <div id="threadScroll">
      <div style="text-align:center;padding:18px 0 24px">
        ${avatar(key, 76, 'av-center')}
        <div class="t-head" style="margin-top:12px;display:flex;align-items:center;justify-content:center;gap:5px">
          ${esc(u.name)}${verified(key)}</div>
        <div class="t-sub" style="font-size:12.5px">@${esc(u.handle)} · ${esc(u.bio)}</div>
        <button class="pill press on-quiet" data-act="user" data-key="${key}" style="margin:12px auto 0">View profile</button>
      </div>
      ${c.msgs.map((m, i) => {
        const prev = c.msgs[i - 1];
        const gap = !prev || prev.f !== m.f;
        return `<div style="display:flex;flex-direction:column;${gap && i ? 'margin-top:8px' : ''}">
          <div class="bub ${m.f === 'me' ? 'bub-me' : 'bub-them'}">${esc(m.t)}</div>
          ${i === c.msgs.length - 1 ? `<div class="t-sub" style="font-size:10.5px;margin-top:4px;
             align-self:${m.f === 'me' ? 'flex-end' : 'flex-start'}">${esc(m.w)}</div>` : ''}
        </div>`;
      }).join('')}
      <div id="typing" hidden style="align-self:flex-start;margin-top:6px">
        <div class="bub bub-them" style="display:flex;gap:4px;padding:13px 15px">
          ${[0, 1, 2].map(i => `<i style="width:6px;height:6px;border-radius:50%;background:var(--ash);
             animation:typedot 1.3s ${i * .16}s infinite"></i>`).join('')}
        </div>
      </div>
  </div>
  <style>@keyframes typedot{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}</style>`;
}

export const threadDock = ({ key }) => {
  if (state.blocked[key]) return `<div class="btn btn-ghost" style="pointer-events:none;font-size:14px">
    You blocked @${esc(USERS[key].handle)}</div>`;
  return `<div class="field" style="height:48px;padding-left:16px;padding-right:5px">
    <input id="msgInput" data-input="msg" placeholder="Message" autocomplete="off"
      enterkeyhint="send" aria-label="Write a message">
    <button class="press" data-act="send" aria-label="Send"
      style="width:38px;height:38px;flex:none;border-radius:var(--r-full);display:grid;place-items:center;
             background:var(--ember);color:#180804">${ico('send', 18)}</button>
  </div>`;
};

export function openComposeTargets() {
  return Object.keys(USERS).filter(k => k !== 'ava' && !state.blocked[k]);
}
