# Went To Event — PWA preview

What is on near you, and who is going. Join in two taps, keep a record of the
good ones, and publish your own in four steps.

**Live:** https://ilyatabrizi.github.io/went-to-event/
**Local:** `python3 serve.py` → http://localhost:8141
**Tests:** `python3 e2e.py` → 113 checks + screenshots into `docs/shots/`

Built by Alpha Agency. Installable on iOS and Android; works offline once opened.

---

## The design system

This is the second design pass. The first one was its own thing; this one is
**the house system every Alpha preview uses** — the shell, the fixed bar, the
floating glass tab bar with a capsule that slides under the active tab, serif
page titles over a geometric sans, cards, round row icons, pills, and bottom
sheets that drag to dismiss. What changed is the interface. What did **not**
change is the brand: the palette and the `e.` mark are the client's own.

### The palette, kept — 70·25·4·1

| | | share | where it lives |
|---|---|---|---|
| Ink | `#0B0A0C` | 70% | the ground everything sits on |
| Bone | `#F4F1EC` | 25% | the words, and **every action** |
| Ash | `#8A848F` | 4% | secondary copy, inactive tabs, hairlines |
| Ember | `#FF5B3D` | 1% | the one thing in a view that is *live* |
| Milk | `#F7F2E9` | — | the ticket pass, and nothing else |

**Bone is the action colour.** In a dark room it does the job black does in a
light app: the primary button, the active tab capsule, the chip you chose.

**Ember is not a second brand colour.** It marks the thing that is actually
happening — the Tonight pill, the live dot, the pin on the map, the confirm
mark, the unread badge. Never body copy; it passes contrast for large text and
graphics only. If two things in a view are Ember, one of them is wrong.

Gold is gone. The previous pass invented it for membership; membership now uses
Bone, which is what the guidelines already had.

### Type

**Fraunces** for page titles, event titles and any number that deserves weight.
**Plus Jakarta Sans** for everything else. Both are vendored as woff2 and
preloaded — no CDN, no layout shift. The pairing is ours but unused by any other
preview, so this does not read as a sibling of NORM or Balance.

## The interface

- **One shell, 448px wide**, centred with a calm surround on desktop rather than
  a tab bar stretched across 1600px.
- **A bar that earns its background.** Transparent over a hero, and only once
  content is under it does it take a blur and a hairline.
- **A tab bar that is one object.** Five tabs, a Bone capsule that springs
  between them, and unread dots that live on the bar so they survive every
  navigation.
- **One dock, one primary action.** Each screen declares its own bar and dock;
  the shell just paints them. A screen that cannot say what its own back button
  and primary action are ends up wearing the previous screen's.
- **Sheets over modals.** Drag to dismiss from the top, focus trapped while up,
  focus handed back on the way out.
- **Reduced motion, reduced transparency and increased contrast** are all read
  from the device and honoured.

## What is in it

Five tabs — **Home · Explore · Chat · Went · You** — and eighteen screens.

**Home** — one event takes a full-bleed hero, a For You / Following switch, a
"happening tonight" rail, and a scored feed where every card says *why* it is
there.
**Explore** — search, fifteen categories ranked by how full they are, a filter
sheet (when / price / sort), free-this-week and closest-to-you rails.
**Event** — hero, when/where card, a map schematic, host with follow, who is
going, tiers, more from the host, similar events, report.
**Booking** — tier picker, quantity, checkout with three methods, a booking fee
that membership waives, confirmation, and the pass.
**Chat** — conversations with search, threads that reply back once.
**Went** — what you are going to and what you have been to, split Upcoming /
Past, each opening a Milk pass with a scannable-looking code.
**You** — profile with posts/saved/going, the publish CTA, membership, and a
settings tree (account, notifications, privacy, blocked, muted, payment,
appearance, help, legal, about).
**Publish** — four steps, with the card being built visible as you type and a
payout that tracks the price field on every keystroke.
**Anywhere** — a country rail and city list with "living here" / "just
visiting". San Francisco is hand-written; every other city generates a full,
deterministic catalogue from its own name, so Tokyo is the same Tokyo each time.

## Structure

```
index.html            shell: bar, view, dock, tab bar, sheet + toast roots, boot
css/app.css           tokens, materials, components, a11y media queries
js/
  app.js              routes, the bars, the dock, the global actions
  router.js           hash routing, per-render container, scroll memory
  store.js            state, what persists, subscribers
  place.js            which city, and the feed scoring behind "why this event"
  parts.js            cover, cards, rows, avatars, empties, the bar shapes
  ui.js               toast, sheet, stepper, segmented
  motion.js           may I animate, may I buzz
  icons.js            one 24-grid icon set and the e. mark
  install.js          add to home screen, including the iOS explanation
  data/               geo (countries, categories, covers), people, events
  views/              home explore chat went profile detail booking
                      create settings pickers
sw.js                 network-first for app files, cache-first for cover images
e2e.py                113 checks in real Chrome, screenshots into docs/shots/
serve.py              local preview on :8141, no-store
```

### Four decisions worth knowing

**Every render gets a fresh container.** Setting `#view.innerHTML` leaves any
listener a view bound to `#view` still attached, so after two visits one tap
fires the handler twice — a toggle flips and flips back. Views are handed a new
node each render, and their listeners die with it. `e2e.py` visits a settings
page three times and taps once to keep it that way.

**Assigning the hash it already has fires no `hashchange`.** A view that
"navigates" to itself would silently do nothing, which is how a four-step
publish flow stops advancing. Anything re-rendering its own screen calls
`refresh()`, and `go()` catches the rest.

**The service worker is network-first for same-origin files.** Cache-first is
the usual advice and it is a trap: once a build is cached, an edit never reaches
anyone until the cache name changes, and a stale shell paired with a fresh
module is worse than being offline. Cover images stay cache-first — they never
change at a given URL and they are the expensive part. The worker does not
register on localhost at all.

**Cover photography is hotlinked from Unsplash**, with a brand gradient painted
underneath every one. A blocked, slow or 404'd image degrades to the palette
rather than to a grey hole, and errors retry once then stay hidden rather than
removing the element. Swap `IMG` in `js/data/geo.js` for client imagery when
there is any.

## Placeholder, and deliberately so

Event copy, hosts, venues, prices, people and conversations are invented for the
preview. Payment, sign-in, real ticketing and the QR payload are stubbed —
anything stubbed says so on screen rather than pretending. Nothing here talks to
a server; state lives in `localStorage` and **Settings → Reset this preview**
clears it.

### Running the tests

`covers decoded` fails inside a sandboxed agent session, where
`images.unsplash.com` resolves to a private address and every cover 404s. That
is not a code fault — the gradient fallback is doing its job. It passes on a
normal machine. Screenshots captured in that environment have no cover art, so
regenerate them with `python3 e2e.py --shots-only` outside a sandbox before
using them anywhere.
