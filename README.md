# Went To Event — PWA preview

What is on near you. Join in two taps, keep a record of the good ones, publish
your own in two steps.

**Live:** https://ilyatabrizi.github.io/went-to-event/
**Local:** `python3 serve.py` → http://localhost:8141
**Tests:** `python3 e2e.py` → 64 checks + screenshots into `docs/shots/`

Built by Alpha Agency. Installable on iOS and Android; works offline once opened.

---

## The system

**An event is a typographic entry on a page, not a picture in a box.**

The arbiter sentence, for when it is late and a new screen needs a decision:
**there are no cards.** If it has artwork worth looking at it is a **Plate**, and
there is one per screen. If it is an event it is an **Entry**. Everything else is
a **Row**.

Content sits on the Ink ground, divided by one hairline, on one 24px gutter, in
one seven-step scale. Twelve components, three shell parts, two radii and a
pill. No `style=` attribute appears anywhere in view code.

### Surfaces — lightness *is* elevation

| | | |
|---|---|---|
| Ink | `#0B0A0C` | the ground, ~88% of every screen |
| Raise | `#1C1A20` | the only raised fill |
| Raise-2 | `#2B2930` | the pressed state of anything already on Raise |

Three fills, two real perceptual steps. There are no dark wells: on a ground
this dark a recessed fill is invisible, which is why the previous build's
four-level elevation system spanned 8 L\* and read as flat mud.

### Type — three tiers

| | | |
|---|---|---|
| Bone | `#F4F1EC` | titles, prices, and every primary fill — 17.5:1 |
| Prose | `#B4AEB9` | multi-line body copy, and nothing else |
| Ash | `#8A848F` | all metadata, section heads, placeholders, inactive tabs |

### Ember — four uses, enumerated

The live dot. The keyboard focus ring. Destructive text. The dot in the `e.`
mark, which appears on the pass and the publish success screen only.

That is the whole list, and a screen shows **at most one**, asserted by the
suite. Never a background, never wider than 8px, never body copy.

### Seven type steps

`40 · 28 · 20 · 16 · 14 · 12 · 11`, leading in even px so a block of any length
lands back on the grid. Four weights: 400, 500, 600, 700. Tracking is a formula
— `0.0075 − 0.0011 × size` — so large type is always tighter than small by
construction, with one `@supports` block carrying Apple's own positive table
where SF Pro is actually rendering.

The build this replaced had **22 font sizes**, eight of them half-pixel steps
inside an 8px band, and six weights including 550 and 650 — which SF Pro rounds
and Inter interpolates, so the same screen had different weight relationships on
iPhone than on Android.

### Space, radius, motion

4pt scale, eight steps, nothing between them. One gutter: 24px, for the page,
the section head, the rule and the rail. Two radii and a pill, where a child's
radius is its parent's minus the inset, so corners close at every level.

Three durations (120 press · 240 state · 380 sheet), two curves, **nothing
loops**. Boxes scale on press at exactly 0.97; **lists do not** — an Entry takes
a full-bleed wash instead, because a list row that shrinks under a finger is the
clearest toy tell on a phone.

### Type is set in SF Pro

Via `-apple-system`: Apple's own face, already on the device, optically sized at
every step by the browser. Inter is the vendored fallback for Android and
Windows. Icons are **Lucide** (ISC), with the stroke derived from the rendered
size — `33.6 / px` — so optical weight holds at ~1.4px at 16, 20 and 24.

### The artwork is drawn, and monochrome

Every cover is generated SVG: six compositions — a shaft of light, a horizon, a
skyline, thrown rings, a ticket grid, a waveform — over a neutral near-black
duotone, seeded on the event so a given night looks the same on every device and
forever. **The poster authors against its target ratio**, rather than being
drawn for one box and sliced into another.

The fifteen category hues this replaced were **eleven verbatim Tailwind
defaults** plus one four-points-from-Ember clone. Identity comes from the
composition and its seed, so nobody has to notice that Markets renders brighter
than Nightlife for a reason they cannot name.

## What is in it

Three tabs — **Home · Went · You** — eight routes and three sheets. Eleven
surfaces, against about thirty-five before.

**Home** — the city, a search field, nine chips, one Plate with the night worth
leaving the house for, then every event grouped under day heads. The lead is
excluded from the list below it.
**Event** — the Plate, the title, and the three deciding facts inside the first
screen: when, where, what it costs. About, host, tiers. One primary action.
**Tickets** — a sheet, at the point of decision, and only when there is more
than one tier or a price to pay.
**Pass** — the Milk ticket, the one inverted surface in the app.
**Went** — what you are going to, then Earlier. Seeded, so the tab the product
is named after is never empty.
**You** — who you are, the publish button, your events, saved, and two controls.
**Publish** — two steps and a success, in one route.
**City** and **Filters** — sheets.

## Structure

```
index.html            shell: bar, view, dock, tab bar, sheet + toast roots
css/app.css           tokens, type, twelve components, three shell parts, motion
js/
  app.js              eight routes, the bar, the dock, three global actions
  router.js           hash routing, per-render container, scroll memory
  store.js            state, what persists, the Went seed
  place.js            which city, and what is on in it
  parts.js            the twelve components
  artwork.js          the poster engine
  ui.js               sheet, and the focus trap
  motion.js           may I animate, may I buzz
  icons.js            Lucide, stroke derived from size
  install.js          add to home screen
  data/               geo (countries, seven categories), people, events
  views/              home detail went profile create pickers
sw.js                 network-first for app files
e2e.py                64 structural checks in real Chrome
serve.py              local preview on :8141, no-store
```

## What the suite actually asserts

Not that a button works — that the system is still a system:

- **One gutter.** Every block child of a `.wrap` on every route starts at 24px.
  The two things that bleed (`.plate`, `.steps`) bleed all the way to 0, not to
  some third value.
- **Zero inline styles** in any view, on any route.
- **Seven type sizes and four weights**, as closed sets, measured from the
  computed style of every element carrying text.
- **Derived hairlines.** An Entry's rule starts at 76px — 64 thumb + 12 gap —
  because the leading element declares its own `--lead`. It cannot drift.
- **No glass** outside the sheet's scrim. **No shadows** cast on the ground.
- **At most one Ember object per screen.**
- **Nothing loops**, and nothing uses `animation-fill-mode: both`.
- **A free RSVP never leaves the screen**, creates no toast, and lands in Went.
- **The artwork is neutral** — sampled from rendered pixels, max channel spread
  ≤ 8.
- **Every deleted route falls back to Home** — `#/chat`, `#/membership`,
  `#/verify`, `#/settings`, `#/checkout/1` and the rest resolve to nothing.

## Decisions worth knowing

**Explore merged into Home.** Measured live: Explore's eleven events were a
strict subset of Home's eighteen, and both of its rails were 100% duplication of
the list beneath them. Two tabs, one dataset, no unique content.

**Chat died with the whole social layer.** Every possible reply in it was the
literal on-screen string "(a scripted reply — the preview answers once so the
thread is not a dead end)", printed in the product, in front of a client.

**The booking fee is gone.** `FEE = 2.5` was applied unconditionally regardless
of price, so RSVPing to a free yoga class walked through a tier picker, a
quantity stepper and a payment sheet under a button reading "Pay $2.50".

**Nothing above a glass surface may carry a transform** — it makes that ancestor
a backdrop root and the glass blurs nothing, silently. Only the scrim is glass
now, but the rule stays: it has bitten this codebase and four sibling builds.

**`popstate` fires on a plain forward hash assignment**, identically to a real
Back. History entries are stamped with an index; it is only a Back when the
entry you land on carries a lower one.

## Placeholder, and deliberately so

Every event, host, venue, price and person is invented. The QR payload is
generated and will not scan. Nothing talks to a server; state lives in
`localStorage` and **You → Reset this preview** clears it. Two lines in the app
say so — under the pass and in You's footer. The previous build apologised on
nine screens, which reads as unfinished rather than honest.
