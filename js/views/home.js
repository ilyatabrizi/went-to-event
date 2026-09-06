/* Home. One event gets the full-bleed hero — the thing worth leaving the house
   for tonight — and everything under it explains itself. */

import { state, allPosts, save } from "../store.js";
import { esc, compact, money } from "../util.js";
import { icon } from "../icons.js";
import { cityName, cityEvents, feedFor, reason, happeningSoon } from "../place.js";
import {
  eventCard, railCard, sectionHead, postCard, empty, lazyImages,
  cover, avStack, brandMark,
} from "../parts.js";
import { segmented } from "../ui.js";

export default function home() {
  const feed = feedFor(state.homeFeed);
  const hero = feed[0];
  const rest = feed.slice(1, 9);
  const soon = happeningSoon();
  const posts = allPosts().slice(0, 3);
  const city = cityName();

  const html = `
    ${hero ? heroBlock(hero) : ""}

    <div class="wrap" style="${hero ? "padding-top:22px" : "padding-top:14px"}">
      ${segmented("homefeed", [
        { key: "foryou", label: "For you" },
        { key: "following", label: "Following" },
      ], state.homeFeed)}
    </div>

    ${soon.length >= 2 && state.homeFeed === "foryou" ? `
      <section class="section">
        <div class="wrap">${sectionHead(
          soon.some((e) => e.soon) ? "Happening tonight" : "Happening this week",
          { href: "#/explore", label: "See all" })}</div>
        <div class="rail">${soon.map(railCard).join("")}</div>
      </section>` : ""}

    <section class="section wrap">
      ${feed.length ? `
        ${sectionHead(state.homeFeed === "foryou" ? "Picked for you" : "From people you follow")}
        <div class="stack stagger" style="gap:20px">
          ${rest.map((ev) => eventCard(ev, { why: reason(ev) })).join("")}
        </div>`
      : empty("users", "Nothing here yet",
          "Follow a few hosts or friends and their events land in this feed.",
          { href: "#/explore", label: `Browse ${city}` })}
    </section>

    ${posts.length ? `
      <section class="section wrap">
        ${sectionHead("From your circle", { href: "#/you", label: "See all" })}
        <div class="stack">${posts.map(postCard).join("")}</div>
      </section>` : ""}

    <footer style="text-align:center;padding:44px 0 8px;opacity:.42">
      <div style="display:flex;justify-content:center;margin-bottom:9px;color:var(--mute)">
        ${brandMark(24)}</div>
      <div class="label">${cityEvents().length} events in ${esc(city)}</div>
    </footer>`;

  return {
    html,
    mount(el) {
      /* The hero runs under the bar, so the view loses its top padding — but
         only while a hero is actually on screen. */
      document.getElementById("shell").dataset.hero = hero ? "1" : "0";
      lazyImages(el);
    },
  };
}

function heroBlock(ev) {
  return `
  <a class="hero" href="#/event/${ev.id}" aria-label="${esc(ev.title)}, ${esc(ev.when)}">
    <span class="cover">${cover(ev, { tall: true })}</span>
    <span class="hero-body">
      <span class="hero-meta">
        ${ev.soon ? `<span class="live"><i class="dot"></i>Tonight</span>` : ""}
        <span class="badge">${esc(ev.when)}</span>
      </span>
      <span class="hero-title">${esc(ev.title)}</span>
      <span class="row" style="gap:9px">
        ${ev.friends?.length ? avStack(ev.friends, 3) : ""}
        <span class="small">${compact(ev.going)} going · ${esc(ev.venue)}</span>
      </span>
      <span class="row" style="gap:9px;margin-top:2px">
        <span class="btn btn-primary btn-sm" style="pointer-events:none">
          ${ev.minPrice === 0 ? "RSVP · Free" : `Tickets from ${money(ev.minPrice)}`}</span>
      </span>
    </span>
  </a>`;
}
