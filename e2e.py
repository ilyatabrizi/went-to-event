#!/usr/bin/env python3
"""Assert the DESIGN SYSTEM, not a feature walk.

    python3 serve.py &          # or the preview task
    python3 e2e.py              # checks + screenshots into docs/shots/

Most of what follows is structural: one gutter, seven type sizes, four weights,
derived hairlines, no inline styles, no glass outside the scrim, nothing that
loops. A feature test tells you a button still works; these tell you the system
is still a system. Playwright drives the system Chrome — no browser download.
"""

import pathlib
import sys

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8141'
SHOTS = pathlib.Path(__file__).resolve().parent / 'docs' / 'shots'
VIEW = {'width': 375, 'height': 812}

TABS   = ['#/', '#/went', '#/you']
PUSHED = ['#/event/1', '#/pass/0', '#/saved', '#/u/Substrata%20Collective', '#/publish']
ALL    = TABS + PUSHED

TYPE_SIZES = {'40px', '28px', '20px', '16px', '14px', '12px', '11px'}
WEIGHTS    = {'400', '500', '600', '700'}

ok, bad, noise = 0, [], []


def check(name, cond, extra=''):
    global ok
    if cond:
        ok += 1
    else:
        bad.append(f'{name} {extra}'.strip())
    print(('  ok   ' if cond else '  FAIL ') + name + (f'  {extra}' if extra and not cond else ''))


def shot(page, name):
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.wait_for_timeout(420)
    raw = SHOTS / f'{name}.png'
    page.screenshot(path=str(raw))
    try:
        from PIL import Image
        im = Image.open(raw).convert('RGB')
        w = 585
        im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(
            raw.with_suffix('.webp'), 'WEBP', quality=84, method=6)
        raw.unlink()
    except ImportError:
        pass


def nav(page, hash_, settle=460):
    page.evaluate(f'location.hash = {hash_!r}')
    page.wait_for_timeout(settle)


def tap(page, sel, settle=460):
    page.evaluate(f"(()=>{{const e=document.querySelector({sel!r}); if(e) e.click();}})()")
    page.wait_for_timeout(settle)


def route(page):
    return page.evaluate("(location.hash || '#/').replace(/^#/, '')")


def text(page, sel='#view'):
    return page.locator(sel).inner_text()


def count(page, sel):
    return page.evaluate(f"document.querySelectorAll({sel!r}).length")


# Every element in #view that actually carries text.
TEXT_NODES = """
[...document.querySelectorAll('#view *')].filter(n =>
  [...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim().length > 0))"""


def main():
    global ok
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome')
        ctx = browser.new_context(viewport=VIEW, device_scale_factor=2,
                                  is_mobile=True, has_touch=True)
        page = ctx.new_page()
        page.on('console', lambda m: m.type == 'error' and noise.append('console.error: ' + m.text))
        page.on('requestfailed', lambda r: bad.append('request failed: ' + r.url))

        page.goto(BASE, wait_until='networkidle')
        page.wait_for_timeout(1200)
        page.evaluate('localStorage.clear()')
        page.reload(wait_until='networkidle')
        page.wait_for_timeout(1400)

        # ------------------------------------------------------------ system
        print('the system')

        # 1 — ONE GUTTER
        lefts = set()
        for h in ALL:
            nav(page, h)
            lefts |= set(page.evaluate("""
                [...document.querySelectorAll('.wrap:not(.center)')]
                  .flatMap(w => [...w.children])
                  .filter(c => {
                    const d = getComputedStyle(c).display;
                    /* .plate and .steps bleed past the gutter on purpose; an
                       inline box sits where its text puts it. */
                    return c.getBoundingClientRect().width > 0
                        && !d.startsWith('inline')
                        && !c.classList.contains('plate')
                        && !c.classList.contains('steps');
                  })
                  .map(c => Math.round(c.getBoundingClientRect().left))"""))
        check('one gutter, on every route', lefts <= {24}, f'left edges seen: {sorted(lefts)}')
        # and the two that bleed do so all the way, not to some third value
        nav(page, '#/')
        check('the plate bleeds to the edge, not to a second gutter', page.evaluate(
            "Math.round(document.querySelector('.plate').getBoundingClientRect().left)") == 0)

        # 2 — NO INLINE STYLES
        inline = {}
        for h in ALL:
            nav(page, h)
            n = page.evaluate(
                "[...document.querySelectorAll('#view [style]')]"
                ".filter(n => !/^flex:\\s*(1|none);?$/.test(n.getAttribute('style'))).length")
            if n: inline[h] = n
        check('no inline styles in any view', not inline, str(inline))

        # 3 + 4 — SEVEN SIZES, FOUR WEIGHTS
        sizes, weights = set(), set()
        for h in ALL:
            nav(page, h)
            sizes |= set(page.evaluate(f"{TEXT_NODES}.map(n => getComputedStyle(n).fontSize)"))
            weights |= set(page.evaluate(f"{TEXT_NODES}.map(n => getComputedStyle(n).fontWeight)"))
        check('seven type sizes and no more', sizes <= TYPE_SIZES,
              f'extra: {sorted(sizes - TYPE_SIZES)}')
        check('four weights and no more', weights <= WEIGHTS,
              f'extra: {sorted(weights - WEIGHTS)}')

        # 6 — NO GLASS but the scrim
        nav(page, '#/')
        glassy = page.evaluate(
            "[...document.querySelectorAll('*')].filter(e => {"
            "const f = getComputedStyle(e); "
            "return (f.backdropFilter && f.backdropFilter !== 'none') || "
            "(f.webkitBackdropFilter && f.webkitBackdropFilter !== 'none');})"
            ".map(e => e.className.toString() || e.tagName)")
        check('no glass outside the scrim', all('scrim' in c for c in glassy) if glassy else True,
              str(glassy))
        check('the bar is opaque', page.evaluate(
            "getComputedStyle(document.querySelector('.bar')).backdropFilter") in ('none', ''))

        # 7 — NO SHADOWS inside a view
        shadows = {}
        for h in ALL:
            nav(page, h)
            s = page.evaluate(
                "[...document.querySelectorAll('#view *')]"
                ".filter(n => { const b = getComputedStyle(n).boxShadow;"
                "return b && b !== 'none' && !n.classList.contains('tile')"
                " && !n.classList.contains('mark'); })"
                ".map(n => n.className.toString()).slice(0,4)")
            if s: shadows[h] = s
        check('no shadows cast on the ground', not shadows, str(shadows))

        # 8 + 9 — DERIVED HAIRLINES
        nav(page, '#/')
        entry_rule = page.evaluate(
            "(()=>{const e=[...document.querySelectorAll('.entry')][1];"
            "return e ? getComputedStyle(e,'::before').left : null})()")
        check('the entry hairline starts at the copy, not the edge', entry_rule == '76px',
              f'{entry_rule} (want 76px = 64 thumb + 12 gap)')
        nav(page, '#/event/1')
        mark_rule = page.evaluate(
            "(()=>{const r=[...document.querySelectorAll('.row--mark')];"
            "return r.length ? getComputedStyle(r[0],'::before').left : 'n/a'})()")
        plain_rule = page.evaluate(
            "(()=>{const r=[...document.querySelectorAll('.row:not(.row--mark)')][1];"
            "return r ? getComputedStyle(r,'::before').left : 'n/a'})()")
        check('a plain row rules from the gutter', plain_rule in ('0px', 'n/a'), plain_rule)

        # 10 — RAILS DO NOT BOOT SCROLLED
        nav(page, '#/')
        check('rails start at the left edge', page.evaluate(
            "[...document.querySelectorAll('.rail')].every(r => r.scrollLeft === 0)"))
        check('and reserve the gutter when they scroll', page.evaluate(
            "getComputedStyle(document.querySelector('.rail')).scrollPaddingInlineStart") == '24px')

        # 11 — TOUCH TARGETS
        small = {}
        for h in ALL:
            nav(page, h)
            s = page.evaluate("""
              [...document.querySelectorAll('#view a[href], #view button')].filter(n => {
                const r = n.getBoundingClientRect(); if (!r.width) return false;
                /* a link inside a sentence is text, not a control */
                if (getComputedStyle(n).display === 'inline') return false;
                const pad = n.classList.contains('chip') ? 8 : 0;
                return r.height + pad < 43.5;
              }).map(n => (n.className.toString()||n.tagName) + '@' +
                     Math.round(n.getBoundingClientRect().height)).slice(0,4)""")
            if s: small[h] = s
        check('every target is at least 44px', not small, str(small))

        # 12 — THREE TABS
        check('three tabs', count(page, '.tab') == 3)
        check('and they are Home, Went, You', page.evaluate(
            "[...document.querySelectorAll('.tab')].map(t => t.getAttribute('href'))")
            == ['#/', '#/went', '#/you'])
        hidden = []
        for h in PUSHED:
            nav(page, h)
            if not page.evaluate("document.querySelector('#tabbar').hidden"): hidden.append(h)
        check('the tab bar is gone on every pushed screen', not hidden, str(hidden))

        # 13 — NO DUPLICATE TITLE
        dupes = []
        for h in PUSHED:
            nav(page, h)
            if page.evaluate("""(()=>{const b=document.querySelector('.bar-t');
              if(!b) return false; const t=b.textContent.trim();
              return [...document.querySelectorAll('#view h1, #view .t-1')]
                .some(n => n.textContent.trim() === t)})()"""):
                dupes.append(h)
        check('no screen prints its own name twice', not dupes, str(dupes))

        # 14 — EMBER IS COUNTABLE
        embers = {}
        for h in ['#/', '#/went', '#/you', '#/saved', '#/event/1']:
            nav(page, h)
            n = page.evaluate("""
              [...document.querySelectorAll('#view *')].filter(e => {
                const s = getComputedStyle(e);
                return s.color === 'rgb(255, 91, 61)' ||
                       s.backgroundColor === 'rgb(255, 91, 61)';}).length""")
            embers[h] = n
        check('at most one Ember object per screen',
              all(v <= 1 for v in embers.values()), str(embers))

        # 15 — NOTHING LOOPS
        loops = {}
        for h in ALL:
            nav(page, h)
            n = page.evaluate(
                "[...document.querySelectorAll('*')].filter(e =>"
                " getComputedStyle(e).animationIterationCount === 'infinite').length")
            f = page.evaluate(
                "[...document.querySelectorAll('*')].filter(e =>"
                " getComputedStyle(e).animationFillMode === 'both').length")
            if n or f: loops[h] = f'{n} infinite, {f} fill:both'
        check('nothing loops, and nothing fills both ways', not loops, str(loops))

        # 16 — THE FEE IS GONE
        blob = ''
        for h in ALL:
            nav(page, h)
            blob += text(page)
        for word in ('2.50', 'Booking fee', 'Platform fee', 'Visa'):
            check(f'no trace of “{word}”', word not in blob)

        # ------------------------------------------------------------ screens
        print('\nhome')
        nav(page, '#/', 700)
        check('the city is a button, not a link', page.evaluate(
            "document.querySelector('.bar-city').tagName") == 'BUTTON')
        check('one plate, and it leads', count(page, '.plate') == 1)
        check('no type sits on the plate', page.evaluate(
            "document.querySelector('.plate').textContent.trim()") == '')
        check('one rail on the screen, and it is the chips', count(page, '.rail') == 1)
        check('nine chips — Filters, All, seven categories', count(page, '.rail .chip') == 9)
        hrefs = page.evaluate("[...document.querySelectorAll('.entry')].map(e => e.getAttribute('href'))")
        check('no event appears twice', len(hrefs) == len(set(hrefs)), f'{len(hrefs)} entries')
        lead = page.evaluate(
            "document.querySelector('#view a.wrap')?.getAttribute('href')")
        check('the lead is excluded from the list below it', lead not in hrefs, f'{lead}')
        h = page.evaluate('document.documentElement.scrollHeight')
        check('the whole city in under 3600px — it was 6,688', h < 3600, f'{h}px')
        check('a second event is visible under the lead without scrolling', page.evaluate(
            "[...document.querySelectorAll('.entry')].some(e =>"
            " e.getBoundingClientRect().top < innerHeight)"))
        audit_shot = shot(page, '01-home')

        print('\nevent')
        nav(page, '#/event/1', 700)
        check('the plate runs full bleed under the bar', page.evaluate(
            "Math.round(document.querySelector('.plate').getBoundingClientRect().left)") == 0)
        check('the three deciding facts are above the fold', page.evaluate(
            "(()=>{const m=document.querySelector('#facts-money');"
            "return m && m.getBoundingClientRect().bottom < innerHeight})()"))
        check('one primary action', count(page, '#dock .btn') == 1)
        check('no map, no who-is-going, no similar events',
              not any(w in text(page) for w in ('Who is going', 'Similar', 'More from', 'Report')))
        shot(page, '02-event')

        print('\nthe core path')
        nav(page, '#/event/2', 600)
        before = page.evaluate('location.hash')
        pass_before = (nav(page, '#/went', 500),
                       count(page, '#view a[href^="#/pass/"]'))[1]
        nav(page, '#/event/2', 600)
        tap(page, '#dock .btn', 700)
        check('a free RSVP never leaves the screen', page.evaluate('location.hash') == before)
        check('the dock becomes the ticket', page.evaluate(
            "document.querySelector('#dock .btn').textContent.trim()") == 'View ticket')
        check('and the facts line says Going', 'Going' in text(page))
        check('no toast was ever created', count(page, '.toast') == 0)
        nav(page, '#/went', 600)
        check('the stub landed in Went',
              count(page, '#view a[href^="#/pass/"]') == pass_before + 1)

        nav(page, '#/event/2', 600)
        check('a free event opens no sheet', count(page, '.sheet') == 0)
        nav(page, '#/event/3', 600)   # two tiers, unseeded
        tap(page, '#dock .btn', 700)
        check('a ticketed event opens exactly one sheet', count(page, '.sheet') == 1)
        check('with a stepper and a total',
              count(page, '.sheet .stepper') == 1 and 'Total' in text(page, '.sheet'))
        shot(page, '03-tickets')
        tap(page, '.sheet #pay', 900)
        check('paying dismisses the sheet and stays put', count(page, '.sheet') == 0
              and page.evaluate('location.hash') == '#/event/3')

        print('\nwent, you, pass')
        nav(page, '#/went', 700)
        check('Went is seeded, never empty', count(page, '#view .entry') >= 4)
        check('with an Earlier section', 'Earlier' in text(page))
        check('and past entries greyed rather than behind a control',
              count(page, '.entry--past') >= 2 and count(page, '.seg') == 0)
        shot(page, '04-went')

        nav(page, '#/pass/0', 700)
        check('the pass is the one Milk surface', count(page, '.pass') == 1)
        check('it carries a QR and a reference', count(page, '.qr') == 1
              and bool(page.evaluate("document.querySelector('.pass-ref').textContent.match(/WTE-\\d{6}/)")))
        check('and no dock — you already have the ticket',
              page.evaluate("document.querySelector('#dock').hidden") is True)
        shot(page, '05-pass')

        nav(page, '#/you', 700)
        check('one primary button, and it publishes',
              'Publish an event' in text(page))
        check('the Haptics row is a destination weight', page.evaluate(
            """(()=>{const r=[...document.querySelectorAll('.row')]
              .find(r => r.textContent.includes('Haptics'));
              return r ? getComputedStyle(r.querySelector('.t-4')).fontWeight : null})()""") == '400')
        check('no membership, no verification, no settings tree',
              not any(w in text(page) for w in ('Membership', 'Verif', 'Settings')))
        shot(page, '06-you')

        print('\npublish')
        nav(page, '#/publish', 700)
        check('two steps, not five', count(page, '.steps i') == 2)
        check('no step label above the bar',
              'Step 1' not in text(page) and 'Step 2' not in text(page))
        check('the dock clears the last field', page.evaluate(
            """(()=>{const f=[...document.querySelectorAll('.field')].pop();
              const d=document.querySelector('#dock');
              return !f || !d || f.getBoundingClientRect().bottom <
                     d.getBoundingClientRect().top})()"""))
        shot(page, '07-publish')

        print('\nthe city sheet')
        nav(page, '#/', 600)
        tap(page, '.bar-city', 800)
        check('the city control opens a sheet', count(page, '.sheet') == 1)
        check('every city is one list under country heads',
              count(page, '.sheet [data-ci]') >= 100 and count(page, '.sheet .head') >= 20)
        check('and no grid of city cards', count(page, '.sheet .tile') == 0)
        shot(page, '08-city')
        page.evaluate("document.querySelector('.scrim').click()")
        page.wait_for_timeout(600)

        # 30 — ROUTE COUNT
        print('\nwhat is gone')
        gone = []
        for h in ['#/chat', '#/explore', '#/notifications', '#/membership', '#/verify',
                  '#/settings', '#/book/1', '#/checkout/1', '#/confirm/1', '#/settings/account']:
            nav(page, h, 420)
            if count(page, '.plate') != 1:
                gone.append(h)
        check('every deleted route falls back to Home', not gone, str(gone))

        # 21 — NO HUE IN THE ARTWORK
        nav(page, '#/', 800)
        try:
            from PIL import Image
            SHOTS.mkdir(parents=True, exist_ok=True)
            box = page.locator('.plate').bounding_box()
            raw = SHOTS / '_plate.png'
            page.locator('.plate').screenshot(path=str(raw))
            im = Image.open(raw).convert('RGB')
            w, h2 = im.size
            worst = 0
            for i in range(20):
                for j in range(20):
                    r, g, b = im.getpixel((int(w * (i + .5) / 20), int(h2 * (j + .5) / 20)))
                    worst = max(worst, max(r, g, b) - min(r, g, b))
            raw.unlink()
            check('the artwork is neutral — no hue survives', worst <= 8, f'max channel spread {worst}')
        except ImportError:
            print('  skip  artwork hue (no PIL)')

        # ---------------------------------------------------------- reduced
        print('\nreduced motion')
        ctx2 = browser.new_context(viewport=VIEW, device_scale_factor=2,
                                   is_mobile=True, has_touch=True, reduced_motion='reduce')
        p2 = ctx2.new_page()
        p2.goto(BASE, wait_until='networkidle')
        p2.wait_for_timeout(1400)
        check('it still starts', p2.locator('#view .plate').count() == 1)
        p2.evaluate("location.hash = '#/went'")
        p2.wait_for_timeout(420)
        check('and still navigates',
              p2.evaluate("(location.hash||'').replace(/^#/,'')") == '/went')
        ctx2.close()

        browser.close()

    print(f'\n{ok} checks passed, {len(bad)} failed')
    if bad:
        print('\nFAILURES')
        for b in bad:
            print('  ' + b)
    if noise:
        print('\nCONSOLE')
        for n in noise[:8]:
            print('  ' + n)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
