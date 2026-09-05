# Went To Event — PWA preview

A working preview of the Went To Event platform: discover events near you, join
in two taps, keep a record of the good ones — and publish your own in four steps.

**Live:** https://ilyatabrizi.github.io/went-to-event/
**Local:** `python3 serve.py` → http://localhost:8141
**Tests:** `python3 e2e.py` → 105 checks + screenshots into `docs/shots/`

Built by Alpha Agency. Installable on iOS and Android; works offline once opened.

---

## The brand, applied

Straight from `WentToEvent_Brand_Guidelines_v1` — **the 70·25·4·1 rule**:

| | | share | where it lives |
|---|---|---|---|
| Ink | `#0B0A0C` | 70% | the ground everything sits on |
| Bone | `#F4F1EC` | 25% | carries the words; primary buttons; the ticket pass |
| Ash | `#8A848F` | 4% | secondary copy, inactive tabs, hairlines |
| Ember | `#FF5B3D` | 1% | **exactly one thing per view** |
| Gold | `#C9A86A` | — | membership only, so it never competes with Ember |

Ember tints (`--ember-2`, `--ember-press`, `--ember-glow`) are **states only** —
hover, press, focus, glow. Never a second brand colour, never body copy.
Bone-on-Ink and Ink-on-Bone are both AAA; every screen is audited at AA or
better by `e2e.py`, including the Milk ticket pass.

The mark is the supplied `e.` — inline SVG in the boot veil and the home footer,
and the full icon set (iOS, Android, web, maskable) from the delivered zip.

## The interface

iOS glass, built the way iOS actually builds it rather than by dropping a blur
on everything:

- **Layered materials.** Four weights — card, raised, chrome, sheet — each with
  a brighter top edge where light catches the surface, and a shadow that gets
  deeper as the surface gets bigger. A lighter translucent surface is never
  stacked on another; legibility collapses when you do that.
- **Scroll-edge effects, not dividers.** Floating chrome fades content out
  beneath it with a masked gradient instead of a 1px rule.
- **Springs, not keyframes.** Every transition is a spring with two parameters
  (damping, response), starts from the value currently on screen, and accepts an
  initial velocity — so it can be grabbed and reversed mid-flight.
- **Gestures track 1:1.** Sheets follow the finger, rubber-band past their top
  edge, project momentum to the nearest detent on release and hand the release
  velocity into the settling spring. Edge-swipe pops the screen, with the parent
  underneath moving at 30% parallax.
- **Haptics at meaningful moments only** — a commit, a snap, an error.
- **Reduced motion, reduced transparency and high contrast** are all honoured.

## What is in it

Five tabs — **Home · Explore · Chat · Went · You** — and eighteen screens.

**Home** — city header, For You / Following, a "happening soon" rail, a scored
feed that says *why* each event is there, and posts from people you follow.
**Explore** — search, fifteen categories, a filter sheet (when / price / sort),
free-this-week and closest-to-you rails.
**Event** — hero, glass when/where card, host with follow, who's going, tiers,
a location schematic, more from the host, similar events, report.
**Booking** — tier picker, quantity, checkout with three payment methods, a
booking fee that membership waives, confirmation, and a QR pass.
**Chat** — conversation list with search, threads that reply back.
**Went** — what you are going to and what you have been to, split Upcoming /
Past, each opening a pass with a scannable-looking code.
**You** — profile with posts/saved/going, the publish CTA, membership, and a
nested settings tree (account, notifications, privacy, blocked, muted, payment,
appearance, help, legal, about).
**Publish** — four steps with a live preview of the card being made and the
payout it earns.
**Anywhere** — a country wheel + city picker with "I live here" / "just
visiting". San Francisco is hand-written; every other city generates a full,
deterministic catalogue from its own name, so Tokyo is the same Tokyo each time.

## Structure

```
index.html            shell: app surface, chrome, sheet + toast roots, boot veil
css/app.css           tokens, glass materials, components, a11y media queries
js/
  app.js              controller: actions, inputs, flows, sheets, boot
  router.js           push/pop stack, edge-swipe back, parallax, refresh
  store.js            state + what persists to localStorage
  util.js             esc, money/amount, seeded rng, momentum projection, velocity
  icons.js            one 24-grid icon set + the brand mark + the member badge
  ui/motion.js        spring runner (damping + response), Animatable, re-target
  ui/sheet.js         drag-to-dismiss sheets with detents and a focus trap
  ui/parts.js         event card, row, rail card, avatars, post card, empties
  ui/toast.js         ui/haptics.js
  data/               geo (countries, categories, covers), people, events
  views/              home explore pickers detail booking went chat
                      profile create settings
sw.js                 network-first for app files, cache-first for cover images
e2e.py                105 checks in real Chrome, screenshots into docs/shots/
serve.py              local preview on :8141, no-store
```

### Two decisions worth knowing

**The service worker is network-first for same-origin files.** Cache-first is
the usual advice and it is a trap: once a build is cached, an edit never reaches
anyone until the cache name changes, and a stale shell paired with a fresh
module is worse than being offline. Cover images stay cache-first — they never
change at a given URL and they are the expensive part. The worker does not
register on localhost at all.

**Cover photography is hotlinked from Unsplash**, with a brand gradient painted
underneath every one. A blocked, slow or 404'd image degrades to the palette
rather than to a grey hole. Swap `IMG` in `js/data/geo.js` for client imagery
when there is any.

**The manifest's three shortcuts actually route.** Long-pressing the installed
icon offers Explore, Went and Publish; each arrives as `?go=`, is honoured at
boot, and then has its query scrubbed so a reload or a shared link doesn't keep
re-firing a jump nobody asked for. `e2e.py` walks all three.

## Placeholder, and deliberately so

Event copy, hosts, venues, prices, people and conversations are invented for the
preview. Payment, sign-in, real ticketing and the QR payload are stubbed —
anything stubbed says so on screen rather than pretending. Nothing here talks to
a server; state lives in `localStorage` and **Settings → Reset this preview**
clears it.
