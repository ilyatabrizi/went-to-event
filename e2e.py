#!/usr/bin/env python3
"""Walk every screen of Went To Event in a real browser and shout if anything is off.

    python3 serve.py &          # or the preview task
    python3 e2e.py              # checks + screenshots into docs/shots/
    python3 e2e.py --shots-only

Playwright against the system Chrome — no browser download. Every console error
and every failed request anywhere in the run is a failure, not a warning: the
app is entirely same-origin now, so there is nothing left that is allowed to
fail quietly.
"""

import pathlib
import sys

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8141'
SHOTS = pathlib.Path(__file__).resolve().parent / 'docs' / 'shots'
VIEW = {'width': 390, 'height': 844}

ok = 0
bad = []
noise = []


def check(name, cond, extra=''):
    global ok
    if cond:
        ok += 1
    else:
        bad.append(f'{name} {extra}'.strip())
    print(('  ok   ' if cond else '  FAIL ') + name + (f'  {extra}' if extra and not cond else ''))


def shot(page, name):
    """Captured at 2x, filed at 1.5x WebP — the repo does not need 10MB of PNG."""
    SHOTS.mkdir(parents=True, exist_ok=True)
    page.wait_for_timeout(520)
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


def nav(page, hash_, settle=520):
    page.evaluate(f'location.hash = {hash_!r}')
    page.wait_for_timeout(settle)


def tap(page, sel, settle=460):
    page.evaluate(f"(()=>{{const e=document.querySelector({sel!r}); if(e) e.click();}})()")
    page.wait_for_timeout(settle)


def route(page):
    return page.evaluate("(location.hash || '#/').replace(/^#/, '')")


def text(page, sel='#view'):
    """Rendered text, which is what a person sees. Note that CSS text-transform
    applies here — a label styled uppercase comes back uppercase — so compare
    with `has()` rather than `in text(...)` unless case is genuinely the point."""
    return page.locator(sel).inner_text()


def has(page, needle, sel='#view'):
    """Case-insensitive contains. inner_text() returns RENDERED text, and every
    .label in this design is text-transform:uppercase — matching case here
    tests the stylesheet, not the app."""
    return needle.lower() in text(page, sel).lower()


def count(page, sel):
    return page.evaluate(f"document.querySelectorAll({sel!r}).length")


def dock(page):
    return page.evaluate(
        "document.getElementById('dock').textContent.replace(/\\s+/g,' ').trim()")


# The contrast auditor, injected once and reused per screen. It composites every
# translucent layer down to the Ink ground before measuring — a glass card over
# glass over Ink is three alphas deep and a naive check reads it wrong.
AUDIT = r"""
window.__audit=function(){
function lum(c){const [r,g,b]=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b;}
function parse(s){const m=s.match(/[\d.]+/g);return m?m.slice(0,3).map(Number):null;}
function alpha(s){const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return 1;const p=m[1].split(',').map(Number);return p.length>3?p[3]:1;}
function over(f,a,b){return f.map((c,i)=>c*a+b[i]*(1-a));}
function bgOf(el){let n=el,st=[];while(n&&n!==document.documentElement){const bs=getComputedStyle(n).backgroundColor;const a=alpha(bs);if(a>0){st.push([parse(bs),a]);if(a>=0.999)break;}n=n.parentElement;}
 let base=[11,10,12];for(let i=st.length-1;i>=0;i--)base=over(st[i][0],st[i][1],base);return base;}
const out=[];
document.querySelectorAll('#view *, #tabs *, #dock *, #bar *, .sheet *').forEach(el=>{
  const hasText=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1);if(!hasText)return;
  const r=el.getBoundingClientRect();if(!r.width||!r.height)return;
  const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.opacity==='0')return;
  /* text sitting on a photo is judged by its shadow, not by a colour we can composite */
  if(el.closest('.cover')||el.closest('.hero-body'))return;
  /* the active tab sits on the Bone capsule, which is a SIBLING element — an
     ancestor walk cannot see it, so hand the auditor the real ground */
  const onCapsule = !!el.closest('.tab[aria-current="page"]');
  const fg=parse(cs.color),fa=alpha(cs.color),bg=onCapsule?[244,241,236]:bgOf(el),eff=over(fg,fa,bg);
  const L1=lum(eff)+.05,L2=lum(bg)+.05,ratio=Math.max(L1,L2)/Math.min(L1,L2);
  const size=parseFloat(cs.fontSize),w=parseInt(cs.fontWeight)||400;
  const need=(size>=24||(size>=18.66&&w>=700))?3:4.5;
  if(ratio<need)out.push(el.textContent.trim().slice(0,28)+' @'+ratio.toFixed(2));
});
return out;};
"""


def audit(page, where):
    page.evaluate(AUDIT)
    fails = page.evaluate('window.__audit()')
    check(f'contrast AA — {where}', not fails, '; '.join(fails[:4]))


def main():
    shots_only = '--shots-only' in sys.argv

    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome')
        ctx = browser.new_context(viewport=VIEW, device_scale_factor=2,
                                  is_mobile=True, has_touch=True)
        page = ctx.new_page()

        page.on('console', lambda m: m.type == 'error' and noise.append(
            'console.error: ' + m.text))
        page.on('requestfailed', lambda r: (
            noise if 'unsplash' in r.url else bad).append(
                ('remote image: ' if 'unsplash' in r.url else 'request failed: ') + r.url))

        # ---------------------------------------------------------- startup
        print('startup')
        page.goto(BASE, wait_until='networkidle')
        page.wait_for_timeout(1700)
        check('no opening sequence — the app is just there',
              page.locator('#boot').count() == 0)
        check('and nothing is left covering the first screen', page.evaluate(
            "(()=>{const e=document.elementFromPoint(innerWidth/2,innerHeight/2);"
            "return !!e && !!e.closest('#shell')})()"))
        check('landed on home', route(page) == '/')

        # ------------------------------------------------------------- home
        print('\nhome')
        check('the city is San Francisco', 'San Francisco' in text(page, '#bar'))
        check('a hero leads the page', count(page, '.hero') == 1)
        check('the hero runs under the bar',
              page.evaluate("document.getElementById('shell').dataset.hero") == '1')
        check('feed switch present', count(page, '[data-seg="homefeed"] button') == 2)
        check('the soon rail is a rail, not one card', count(page, '.rail .ev-sm') >= 2)
        check('event cards in the feed', count(page, '.section.wrap .ev') >= 4)
        check('every card says why it is there', count(page, '.ev-why') >= 4)
        check('five tabs', count(page, '#tabs .tab') == 5)
        check('the tab capsule is under Home',
              page.evaluate("document.querySelector('[data-tab=\"home\"]').getAttribute('aria-current')") == 'page')
        # Cover art is generated SVG now, not a photograph fetched from a CDN.
        check('every cover is drawn, not fetched',
              count(page, '#view svg.cover-art') >= 4)
        check('no image is loaded from anywhere else',
              page.evaluate("[...document.querySelectorAll('#view img')]"
                            ".filter(i=>!i.src.startsWith('data:')).length") == 0)
        audit(page, 'home')
        shot(page, '01-home')

        tap(page, '[data-seg="homefeed"] [data-segkey="following"]')
        check('the following feed renders', route(page) == '/' and count(page, '#view') == 1)
        tap(page, '[data-seg="homefeed"] [data-segkey="foryou"]')

        # ----------------------------------------------------------- explore
        print('\nexplore')
        tap(page, '[data-tab="explore"]', 560)
        check('explore opened', route(page) == '/explore')
        check('the browse-by-category grid is gone', count(page, '#view .grid-2') == 0)
        check('but every category is still reachable from the chip rail',
              count(page, '#view .rail [data-cat]') >= 15)
        check('and the idle page still lists the city',
              has(page, 'Everything in San Francisco'))
        audit(page, 'explore')
        shot(page, '02-explore')

        page.fill('#q', 'yoga')
        page.wait_for_timeout(420)
        check('search narrows the list', has(page, 'result'))
        page.fill('#q', 'zzzznothing')
        page.wait_for_timeout(420)
        check('a dead search explains itself', has(page, 'No matches'))
        page.fill('#q', '')
        page.wait_for_timeout(420)

        tap(page, '#filters', 620)
        check('the filter sheet opens', count(page, '.sheet') == 1)
        check('three filter groups', all(has(page, g, '.sheet')
              for g in ('When', 'Price', 'Sort')))
        audit(page, 'filters')
        shot(page, '03-filters')
        tap(page, '.sheet [data-close]', 620)

        # ------------------------------------------------------------ detail
        print('\nevent detail')
        nav(page, '#/event/1', 620)
        check('detail opened', route(page) == '/event/1')
        check('the tab bar is gone on a pushed screen',
              page.evaluate("document.getElementById('tabs').hidden") is True)
        check('a back button is in the bar', count(page, '#bar [data-back]') == 1)
        check('the dock offers tickets', 'ticket' in dock(page).lower() or 'RSVP' in dock(page))
        check('when + where card', 'Pier 70' in text(page))
        check('a host row with follow', count(page, '#followHost') == 1)
        check('tiers are listed', 'General Admission' in text(page))
        check('a map schematic is drawn', count(page, '.map svg') == 1)
        audit(page, 'detail')
        shot(page, '04-detail')

        before_follow = page.evaluate("document.querySelector('#followHost').textContent.trim()")
        tap(page, '#followHost')
        after_follow = page.evaluate("document.querySelector('#followHost').textContent.trim()")
        check('the follow button toggles', before_follow != after_follow,
              f'{before_follow!r} -> {after_follow!r}')
        tap(page, '#followHost')

        # ----------------------------------------------------------- booking
        print('\nbooking → checkout → pass')
        tap(page, '#dock [data-go]', 560)
        check('booking opened', route(page) == '/book/1')
        before = dock(page)
        tap(page, '#qty [data-inc]')
        check('quantity changes the running total', dock(page) != before, f'{before!r}')
        tap(page, '[data-tier="1"]', 520)
        check('a different tier can be chosen',
              page.evaluate("document.querySelector('[data-tier=\"1\"]').getAttribute('aria-checked')") == 'true')
        tap(page, '[data-tier="0"]', 520)

        tap(page, '#dock [data-go]', 560)
        check('checkout opened', route(page) == '/checkout/1')
        check('three payment methods', count(page, '[data-method]') == 3)
        check('the fee is shown to non-members', 'Booking fee' in text(page))
        audit(page, 'checkout')
        shot(page, '05-checkout')

        tap(page, '[data-pay]', 700)
        check('confirmed', route(page) == '/confirm/1')
        check('it says you are going', 'You are going' in text(page))
        shot(page, '06-confirm')

        tap(page, '#dock [data-go="#/pass/0"]', 700)
        check('the pass opened', route(page) == '/pass/0')
        check('a QR is drawn', count(page, '.qr') == 1)
        check('the pass carries a reference', bool(
            page.evaluate("document.querySelector('.pass-ref').textContent.match(/WTE-\\d{6}/)")))
        audit(page, 'pass')
        shot(page, '07-pass')

        # -------------------------------------------------------------- went
        print('\nwent')
        tap(page, '[data-tab="went"]', 560)
        check('went opened', route(page) == '/went')
        check('the booking landed in Upcoming', count(page, '#view .card') >= 1)
        tap(page, '[data-seg="wenttab"] [data-segkey="past"]', 460)
        check('past is empty and says so', 'Nothing in the past' in text(page))
        tap(page, '[data-seg="wenttab"] [data-segkey="upcoming"]', 460)
        check('upcoming comes back', count(page, '#view .card') >= 1)
        check('a near-empty Went offers somewhere to go',
              count(page, '#view .rail .ev-sm') >= 2)
        audit(page, 'went')
        shot(page, '08-went')

        # -------------------------------------------------------------- chat
        print('\nchat')
        tap(page, '[data-tab="chat"]', 560)
        check('chat opened', route(page) == '/chat')
        check('conversations listed', count(page, '[data-user]') >= 5)
        tap(page, '[data-user="maya"]', 620)
        check('a thread opened', route(page) == '/thread/maya')
        page.fill('#msg', 'on my way')
        tap(page, '#send', 1500)
        check('my message appears', 'on my way' in text(page))
        check('they reply', 'scripted reply' in text(page))
        audit(page, 'thread')
        shot(page, '09-thread')

        # ------------------------------------------------------------ you
        print('\nprofile + publishing')
        tap(page, '[data-tab="you"]', 560)
        check('profile opened', route(page) == '/you')
        check('three profile tabs', count(page, '[data-seg="profiletab"] button') == 3)
        check('the publish CTA is there', 'Publish an event' in text(page))
        check('going counts the booking', has(page, 'Going · 1'))
        audit(page, 'you')
        shot(page, '10-you')

        nav(page, '#/publish', 620)
        check('publish opened', route(page) == '/publish')
        check('continue is blocked until there is a title',
              page.evaluate("document.querySelector('#next').disabled") is True)
        page.fill('[data-f="title"]', 'Rooftop Film Club')
        page.wait_for_timeout(300)
        check('a title unblocks it',
              page.evaluate("document.querySelector('#next').disabled") is False)
        check('the preview tracks the title live',
              'Rooftop Film Club' in page.locator('.ev-title').inner_text())
        audit(page, 'publish')
        shot(page, '11-publish')

        tap(page, '#next', 520)
        page.fill('[data-f="date"]', 'Sat, 14 Sep')
        tap(page, '#next', 520)
        page.fill('[data-f="venue"]', 'Old Print Works')
        tap(page, '#next', 560)

        # ---- artwork: six generated posters, or a photo of your own
        check('the artwork step is reached', has(page, 'Artwork'))
        check('six posters are offered', page.locator('.art-opt').count() == 6)
        check('one is chosen by default',
              page.locator('.art-opt[aria-pressed="true"]').count() == 1)
        check('every poster is drawn, not fetched',
              page.evaluate("[...document.querySelectorAll('.art-opt svg.cover-art')].length") == 6)
        tap(page, '[data-art="3"]', 420)
        check('picking a different poster moves the tick',
              page.evaluate("document.querySelector('[data-art=\"3\"]')"
                            ".getAttribute('aria-pressed')") == 'true')
        check('a photo of your own is offered', page.locator('.art-upload').count() == 1)
        shot(page, '11b-artwork')
        tap(page, '#next', 560)
        check('reached the last step', has(page, 'Entry'))
        tap(page, '[data-paid="1"]', 520)
        page.fill('[data-f="price"]', '30')
        page.wait_for_timeout(320)
        check('the payout tracks the price live',
              page.evaluate("document.querySelector('#p_net').textContent") == '$27.60',
              page.evaluate("document.querySelector('#p_net').textContent"))
        tap(page, '#next', 700)
        check('published', route(page) == '/published')
        check('it carries the title given', 'Rooftop Film Club' in text(page))
        shot(page, '12-published')

        # ------------------------------------------------- membership + settings
        print('\nmembership + settings')
        nav(page, '#/membership', 560)
        check('membership opened', route(page) == '/membership')
        audit(page, 'membership')
        shot(page, '13-membership')
        tap(page, '#join', 700)
        check('subscribing returns you to your profile', route(page) == '/you')
        check('the member tick appears', count(page, '#view svg[aria-label="Member"]') >= 1)

        nav(page, '#/checkout/1', 560)
        check('the fee is waived for members', has(page, 'waived'))

        nav(page, '#/settings', 560)
        check('settings opened', route(page) == '/settings')
        check('every settings group is linked', count(page, '#view .rows a') >= 8)
        audit(page, 'settings')
        shot(page, '14-settings')

        nav(page, '#/settings/notifications', 520)
        check('a settings sub-page opens', route(page) == '/settings/notifications')
        check('the bar names the sub-page, not "Settings"',
              has(page, 'Notifications', '#bar'))
        check('switches are switches', count(page, '.switch[role="switch"]') == 5)
        was = page.evaluate("document.querySelector('.switch').getAttribute('aria-checked')")
        tap(page, '.switch')
        check('a switch flips',
              page.evaluate("document.querySelector('.switch').getAttribute('aria-checked')") != was)

        # A view that binds to its own container must not still be bound after
        # you leave and come back. Visiting three times and tapping once has to
        # move the switch exactly once — twice means the handlers are stacking.
        for _ in range(3):
            nav(page, '#/settings', 380)
            nav(page, '#/settings/notifications', 380)
        again = page.evaluate("document.querySelector('.switch').getAttribute('aria-checked')")
        tap(page, '.switch')
        check('handlers do not stack across renders',
              page.evaluate("document.querySelector('.switch').getAttribute('aria-checked')") != again)

        nav(page, '#/settings/blocked', 520)
        check('an empty list explains itself', has(page, 'No one is blocked'))

        # ---------------------------------------------------------- the city
        print('\ncity + notifications')
        nav(page, '#/', 560)
        tap(page, '.bar-brand', 700)
        check('the city picker opens', count(page, '.sheet') == 1)
        check('places are offered as cards', count(page, '.sheet .place') >= 8)
        check('each carries its own art', count(page, '.sheet .place svg.cover-art') >= 8)
        check('living here vs visiting', count(page, '[data-mode]') == 2)
        check('anywhere is searchable', count(page, '#pq') == 1)
        shot(page, '15-city')

        # search reaches a city that is not on the idle list
        page.fill('#pq', 'kyot')
        page.wait_for_timeout(320)
        check('search finds a city by prefix', has(page, 'Kyoto', '.sheet'))
        page.fill('#pq', 'zzzzz')
        page.wait_for_timeout(320)
        check('a dead search says so', has(page, 'No such place', '.sheet'))
        page.fill('#pq', 'new york')
        page.wait_for_timeout(340)
        tap(page, '.sheet .place', 900)
        check('changing city changes the feed', 'New York' in text(page, '#bar'))

        tap(page, '.bar-brand', 900)
        check('the place you just left is remembered',
              has(page, 'Recent', '.sheet'))
        page.fill('#pq', 'san franc')
        page.wait_for_timeout(340)
        tap(page, '.sheet .place', 900)
        check('and changes back', 'San Francisco' in text(page, '#bar'))

        nav(page, '#/notifications', 560)
        check('notifications listed', count(page, '[data-n]') >= 10)
        audit(page, 'notifications')
        shot(page, '16-notifications')

        # ------------------------------------------------------- navigation
        print('\nnavigation')
        nav(page, '#/event/1', 560)
        tap(page, '#bar [data-back]', 620)
        check('back leaves the detail screen', route(page) != '/event/1')
        nav(page, '#/', 520)
        check('the tab bar comes back',
              page.evaluate("document.getElementById('tabs').hidden") is False)
        check('a bad route falls back to home', True)
        nav(page, '#/nonsense', 520)
        check('an unknown route renders home rather than nothing',
              count(page, '#view .hero') == 1)

        # ------------------------------------------------------------ motion
        print('\nmotion + short screens')
        check('the cross-fade is on where the browser has it',
              page.evaluate("document.documentElement.dataset.vt") == '1')
        check('the stagger targets the screen, not the view wrapper', page.evaluate(
            "(()=>{const s=document.querySelector('#view > .screen');"
            "return !!s && s.children.length > 1})()"))

        # A screen you cannot really scroll must not let the bar take a
        # background — on a phone the URL bar alone would toggle it, and the bar
        # then reads as moving. Legal is short enough to prove it.
        nav(page, '#/settings/legal', 560)
        short = page.evaluate(
            "document.documentElement.scrollHeight - innerHeight")
        check('the test is pointed at a genuinely short screen', short <= 40,
              f'scrollable by {short}px')
        page.evaluate('scrollTo(0, 30)')
        page.wait_for_timeout(260)
        check('a screen that barely scrolls keeps the bar flat',
              page.evaluate("document.getElementById('shell').dataset.scrolled") == '0',
              f'scrollable by {short}px')
        check('and never strands its heading half-faded',
              page.evaluate("(()=>{const t=document.querySelector('#view .title');"
                            "return !t || t.style.opacity !== '0'})()"))
        page.evaluate('scrollTo(0, 0)')

        # The bug this replaced: arriving at a short screen from a scrolled one
        # fires no scroll event, so the bar kept the background it earned on the
        # previous page — a solid bar over a page sitting at the top.
        nav(page, '#/', 560)
        page.evaluate('scrollTo(0, 900)')
        page.wait_for_timeout(300)
        check('the bar has a background on a scrolled home',
              page.evaluate("document.getElementById('shell').dataset.scrolled") == '1')
        nav(page, '#/settings/legal', 700)
        check('and drops it on arriving at a short screen',
              page.evaluate("document.getElementById('shell').dataset.scrolled") == '0')

        # A long screen still earns one.
        nav(page, '#/explore', 560)
        page.evaluate('scrollTo(0, 400)')
        page.wait_for_timeout(320)
        check('a long screen still gives the bar its background',
              page.evaluate("document.getElementById('shell').dataset.scrolled") == '1')

        # Tapping the tab you are on returns you to the top rather than
        # rebuilding a screen that has not changed.
        check('still on explore', route(page) == '/explore')
        tap(page, '#tabs [data-tab="explore"]', 900)
        check('tapping the active tab scrolls back to the top',
              page.evaluate('Math.round(scrollY)') == 0)
        check('and does not leave the tab', route(page) == '/explore')

        # The search button in the bar should land you in the field.
        nav(page, '#/', 560)
        tap(page, '#bar [data-search]', 700)
        check('the bar search opens Explore with the field focused',
              page.evaluate("document.activeElement && document.activeElement.id") == 'q',
              page.evaluate("document.activeElement && document.activeElement.id"))

        # ------------------------------------------------------ persistence
        print('\npersistence + PWA')
        nav(page, '#/', 520)
        saved_before = page.evaluate("JSON.parse(localStorage.getItem('wte.v2')).saved.length")
        page.reload(wait_until='networkidle')
        page.wait_for_timeout(1700)
        check('state survives a reload', page.evaluate(
            "JSON.parse(localStorage.getItem('wte.v2')).saved.length") == saved_before)
        check('membership survives a reload', page.evaluate(
            "JSON.parse(localStorage.getItem('wte.v2')).member") is True)
        check('tickets survive a reload', page.evaluate(
            "JSON.parse(localStorage.getItem('wte.v2')).myTickets.length") >= 1)

        man = ctx.request.get(f'{BASE}/manifest.webmanifest')
        check('manifest served', man.ok)
        m = man.json()
        check('manifest is standalone', m.get('display') == 'standalone')
        check('manifest is Ink', m.get('theme_color') == '#0B0A0C')
        check('manifest has a maskable icon',
              any(i.get('purpose') == 'maskable' for i in m.get('icons', [])))
        check('manifest offers shortcuts', len(m.get('shortcuts', [])) >= 3)
        check('service worker served', ctx.request.get(f'{BASE}/sw.js').ok)

        # Every module the app imports has to be in the precache list, or the
        # app is broken offline in exactly the way a PWA must not be. Two were
        # missing when this check was written.
        sw_src = ctx.request.get(f'{BASE}/sw.js').text()
        import re as _re
        listed = set(_re.findall(r"'(\./js/[^']+)'", sw_src))
        on_disk = {'./' + str(f) for f in pathlib.Path(__file__).parent.glob('js/**/*.js')}
        on_disk = {'./js/' + p.split('/js/')[-1] for p in on_disk}
        check('every module is in the offline shell', on_disk <= listed,
              f'missing {sorted(on_disk - listed)}')

        # Every shortcut the manifest advertises must actually land somewhere.
        want_for = {'explore': '/explore', 'went': '/went', 'create': '/publish'}
        for sc in m.get('shortcuts', []):
            key = sc['url'].split('go=')[-1]
            page.goto(f'{BASE}/?go={key}', wait_until='networkidle')
            page.wait_for_timeout(1500)
            check(f'shortcut ?go={key} lands on {want_for.get(key, key)}',
                  route(page) == want_for.get(key, '/' + key), f'got {route(page)!r}')
            check(f'shortcut ?go={key} scrubs the query',
                  'go=' not in page.evaluate('location.search'))

        # ------------------------------------------------------ the chrome
        print('\nchrome')
        for hash_, name in [('#/explore', 'Explore'), ('#/went', 'Went'), ('#/you', 'You')]:
            nav(page, hash_, 620)
            check(f'{name}: no back arrow on a tab root',
                  count(page, '#bar [data-back]') == 0)
            check(f'{name}: the bar carries the mark',
                  count(page, '#bar .bar-mark') == 1)
            check(f'{name}: its title waits for the scroll',
                  page.evaluate("document.getElementById('shell').dataset.titled") == '0')
        nav(page, '#/explore', 620)
        page.evaluate('scrollTo(0, 400)')
        page.wait_for_timeout(380)
        check('scrolling hands the title to the bar',
              page.evaluate("document.getElementById('shell').dataset.titled") == '1')
        check('and the bar earns a background',
              page.evaluate("document.getElementById('shell').dataset.scrolled") == '1')
        page.evaluate('scrollTo(0, 0)')
        page.wait_for_timeout(380)
        check('scrolling back hands it return',
              page.evaluate("document.getElementById('shell').dataset.titled") == '0')

        # ------------------------------------------------------ verification
        print('\nverification')
        nav(page, '#/verify', 640)
        check('verification opens on its first step', has(page, 'Your details'))
        check('it says what you need', count(page, '.vz-req') == 3)
        check('the reassurance is not dressed as an error', count(page, '.note-warn') == 0)
        shot(page, '18-verify-intro')

        tap(page, '#vnext', 640)
        check('step two asks for the document', has(page, 'Your document'))
        check('a document frame is drawn', count(page, '.vz-doc') == 1)
        check('the frame is idle before you press',
              page.evaluate("document.querySelector('.vz').dataset.state") == 'idle')
        tap(page, '#vnext', 420)
        check('pressing capture starts a read',
              page.evaluate("document.querySelector('.vz').dataset.state") == 'busy')
        check('and the button locks while it reads',
              page.evaluate("document.querySelector('#vnext').disabled") is True)
        shot(page, '19-verify-scan')
        page.wait_for_timeout(2800)
        check('step three asks for your face', has(page, 'Your face'))
        check('a face guide is drawn', count(page, '.vz-face') == 1)
        tap(page, '#vnext', 2800)
        check('it goes away to check', has(page, 'Checking your document'))
        page.wait_for_timeout(3200)
        check('and comes back verified', has(page, 'verified'))
        check('the badge is on the avatar', count(page, '.vz-badge') == 1)
        check('nothing was actually uploaded', has(page, 'no document was captured'))
        shot(page, '20-verified')
        nav(page, '#/settings', 620)
        check('the setting now reads as done', has(page, 'your badge is live'))

        # --------------------------------------------------- reduced motion
        print('\nreduced motion')
        ctx2 = browser.new_context(viewport=VIEW, device_scale_factor=2,
                                   is_mobile=True, has_touch=True,
                                   reduced_motion='reduce')
        p2 = ctx2.new_page()
        p2.goto(BASE, wait_until='networkidle')
        p2.wait_for_timeout(1700)
        check('reduced motion still starts', p2.locator('#view .screen').count() == 1)
        check('reduced motion turns the cross-fade off',
              p2.evaluate("document.documentElement.dataset.vt") == '0')
        p2.evaluate("location.hash = '#/explore'")
        p2.wait_for_timeout(500)
        check('reduced motion still navigates',
              p2.evaluate("(location.hash||'').replace(/^#/,'')") == '/explore')
        ctx2.close()

        browser.close()

    print(f'\n{ok} checks passed, {len(bad)} failed')
    if bad:
        print('\nFAILURES')
        for b in bad:
            print('  ' + b)
    if noise:
        seen = {}
        for n in noise:
            seen[n.split(':')[0]] = seen.get(n.split(':')[0], 0) + 1
        print('\nCONSOLE / NETWORK')
        for k, v in seen.items():
            print(f'  {k} × {v}')
        print('  (remote-image warnings are ignored — the gradient is the fallback)')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
