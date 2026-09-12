# Went To Event — PWA preview

What is on near you, and who is going. Join in two taps, keep a record of the
good ones, and publish your own in four steps.

**Live:** https://ilyatabrizi.github.io/went-to-event/
**Local:** `python3 serve.py` → http://localhost:8141
**Tests:** `python3 e2e.py` → 185 checks + screenshots into `docs/shots/`

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

Two grotesques, no serif. **Archivo** carries every headline — 700–760 weight with
tracking that tightens as the size grows — and **Inter** does the small work, where
it is still the best face on a dark screen. Both are self-hosted variable subsets
(≈35 KB and ≈48 KB); nothing is fetched from a font CDN.

A serif was tried and dropped: it read like a recipe column on a nightlife product,
and the "e." mark itself is geometric sans.

## The interface

- **One shell, 448px wide**, centred with a calm surround on desktop rather than
  a tab bar stretched across 1600px.
- **A bar that earns its background.** Transparent over a hero, and only once
  content is under it does it take a blur and a hairline.
- **A tab bar that is one object.** Five tabs on a floating capsule of glass,
  a Bone lens that springs between them and follows a dragged finger, and
  unread dots that live on the bar so they survive every navigation. Reading
  down a long page folds it to the current tab alone; scrolling back, tapping
  it, or going anywhere opens it again. A short page never folds, and the first
  tap on a folded bar opens it rather than navigating — otherwise you would be
  aiming at tabs you cannot see. Ported from KAIRO.
- **Glass, the iOS way: thin, not frosted.** A small blur, a large saturation
  lift, and a `brightness()` clamp *inside* `backdrop-filter`. The clamp is the
  load-bearing part — it darkens the backdrop itself, which is what lets the
  tint sit at 44% instead of 90% and still hold Bone type over a bright cover.
  Browsers without `backdrop-filter` get solid surfaces instead of unreadable
  ones.
- **One dock, one primary action.** Each screen declares its own bar and dock;
  the shell just paints them. A screen that cannot say what its own back button
  and primary action are ends up wearing the previous screen's.
- **Sheets over modals.** Drag to dismiss from the top, focus trapped while up,
  focus handed back on the way out.
- **No opening sequence.** The app is simply there. The ground is painted
  before anything loads, so the first frame is already Ink and there is nothing
  to fade away from.
- **Screens cross-fade.** Where the browser has View Transitions the whole
  screen dissolves in ~260ms with the bar and tab bar held still as their own
  layers; where it does not, the sections arrive one after another instead.
  Never both.
- **Reduced motion, reduced transparency and increased contrast** are all read
  from the device and honoured.

## What is in it

Five tabs — **Home · Explore · Chat · Went · You** — and twenty screens.

**Home** — one event takes a full-bleed hero, a For You / Following switch, a
"happening tonight" rail, and a scored feed where every card says *why* it is
there.
**Explore** — search, all fifteen categories as a chip rail, a filter sheet of
chips with a live match count, an on-tonight and a free-this-week rail, then
everything in the city. There is no category grid: it was a second, slower way
to do what the chips above it already did.
**Event** — hero, when/where card, a map schematic, host with follow, who is
going, tiers, more from the host, similar events, report.
**Booking** — tier picker, quantity, checkout with three methods, a booking fee
that membership waives, confirmation, and the pass.
**Chat** — conversations with search, threads that reply back once.
**Went** — what you are going to and what you have been to, split Upcoming /
Past, each opening a Milk pass with a scannable-looking code.
**You** — profile with posts/saved/going, the publish CTA, membership, and a
grouped settings tree (account, verification, privacy, notifications, payment,
appearance, help, legal, about).
**Verification** — three steps for the badge hosts look for: what you need, a
document in a frame that scans, a face guide that sweeps, then the wait and the
badge. Nothing is captured or sent, and the screen says so.
**Publish** — five steps, with the card being built visible as you type and a
payout that tracks the price field on every keystroke. Step four is **Artwork**:
six posters drawn from the kind of night it is, or a photo of your own, which
stays on the device.
**Anywhere** — a search across every city on earth, the places you have been,
and city cards carrying their own art, with "living here" / "just visiting". San Francisco is hand-written; every other city generates a full,
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
e2e.py                185 checks in real Chrome, screenshots into docs/shots/
serve.py              local preview on :8141, no-store
```

### Decisions worth knowing

**Every render gets a fresh container.** Setting `#view.innerHTML` leaves any
listener a view bound to `#view` still attached, so after two visits one tap
fires the handler twice — a toggle flips and flips back. Views are handed a new
node each render, and their listeners die with it. `e2e.py` visits a settings
page three times and taps once to keep it that way.

**Assigning the hash it already has fires no `hashchange`.** A view that
"navigates" to itself would silently do nothing, which is how a four-step
publish flow stops advancing. Anything re-rendering its own screen calls
`refresh()`, and `go()` catches the rest.

**Nothing above a glass surface may carry a transform.** A transform, filter,
opacity below 1 or blend mode on any ancestor makes that element a backdrop
root, and the glass inside it blurs nothing at all — silently, everywhere. The
bar and the dock are centred with padding rather than `translateX(-50%)` for
exactly this reason, and the stagger uses `animation-fill-mode: backwards`
rather than `both`, because a *filled* animation ending on `transform: none`
still reports an identity matrix. `e2e.py` walks every glass element and fails
if any ancestor is a backdrop root.

**`popstate` fires on a plain forward hash assignment.** It is indistinguishable
from a real Back by the event alone, so restoring scroll on it dropped you back
down the page you had last read every time you tapped a tab. Each history entry
is stamped with an index as it renders; a popstate is a Back only when the entry
it lands on carries a lower one.

**The bar's background is recomputed on every render, not only on scroll.**
Arriving at a short screen from a scrolled one fires no scroll event, so the
bar kept the background it earned on the previous page — which looked like a
solid bar appearing over a page sitting at the top. A screen that is only
scrollable by the few pixels a phone's URL bar adds never takes one at all.

**Tapping a lit tab does one of two things.** A pushed screen keeps its parent
tab lit, so from there the tap returns to that tab's root. Only when you are
already standing on the root does it scroll to the top instead.

**The service worker is network-first for same-origin files.** Cache-first is
the usual advice and it is a trap: once a build is cached, an edit never reaches
anyone until the cache name changes, and a stale shell paired with a fresh
module is worse than being offline. Cover images stay cache-first — they never
change at a given URL and they are the expensive part. The worker does not
register on localhost at all.

**All artwork is drawn, not fetched.** Every cover is generated SVG: six
compositions — a shaft of light, a horizon, a skyline, thrown rings, a ticket grid,
a waveform — over one hue per category, mostly dark with the colour arriving as a
glow rather than a fill, plus grain and a vignette that hands the bottom back to Ink
so a title always has ground to sit on. It is seeded on the event, so a night looks
the same forever, on every device, offline, with nothing to download.

Stock photography was the wrong answer twice: the same six crowd shots repeated
down a feed and belonged to nobody, and stock headshots standing in for your friends
were worse — so avatars are generated identity marks too. The upshot is that the app
is entirely same-origin: no CDN, no preconnect, one cache, and a preview that works
on a plane.


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
