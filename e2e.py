#!/usr/bin/env python3
"""Walk every screen of Went To Event in a real browser and shout if anything is off.

    python3 serve.py &          # or the preview task
    python3 e2e.py              # checks + screenshots into docs/shots/
    python3 e2e.py --shots-only

Playwright against the system Chrome — no browser download. Every console error
and every failed same-origin request anywhere in the run is a failure, not a
warning. Unsplash covers are hotlinked, so a remote image that 404s is noise we
report but do not fail on: the gradient underneath is the designed fallback.
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
    page.wait_for_timeout(500)
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


def tap(page, sel, settle=420):
    page.evaluate(f"(()=>{{const e=document.querySelector({sel!r}); if(e) e.click();}})()")
    page.wait_for_timeout(settle)


def top(page):
    return page.evaluate(
        "(()=>{const s=[...document.querySelectorAll('#app .screen')].pop();"
        "return s?s.dataset.screen:null})()")


def dock(page):
    return page.evaluate(
        "document.getElementById('dock').textContent.replace(/\\s+/g,' ').trim()")


def in_top(page, sel):
    """Query inside the screen on top of the stack — screens underneath are
    still in the DOM, so a bare querySelector reaches the wrong one."""
    return page.evaluate(
        f"(()=>{{const s=[...document.querySelectorAll('#app .screen')].pop();"
        f"return s?s.querySelectorAll({sel!r}).length:0}})()")


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
document.querySelectorAll('#app .screen:last-child *, #tabbar *, #dock *, .sheet *').forEach(el=>{
  const hasText=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1);if(!hasText)return;
  const r=el.getBoundingClientRect();if(!r.width||!r.height)return;
  const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.opacity==='0')return;
  const fg=parse(cs.color),fa=alpha(cs.color),bg=bgOf(el),eff=over(fg,fa,bg);
  const L1=lum(eff)+.05,L2=lum(bg)+.05,ratio=Math.max(L1,L2)/Math.min(L1,L2);
  const size=parseFloat(cs.fontSize),w=parseInt(cs.fontWeight)||400;
  const need=(size>=24||(size>=18.66&&w>=700))?3:4.5;
  if(ratio<need)out.push(el.textContent.trim().slice(0,28)+' @'+ratio.toFixed(2));
});
return out;};
"""


def audit(page, where):
    fails = page.evaluate('window.__audit()')
    check(f'contrast AA — {where}', not fails, '; '.join(fails[:4]))


def run(shots_only=False):
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome')
        ctx = browser.new_context(viewport=VIEW, device_scale_factor=2,
                                  is_mobile=True, has_touch=True,
                                  user_agent=('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like '
                                              'Mac OS X) AppleWebKit/605.1.15 (KHTML, like '
                                              'Gecko) Version/17.0 Mobile/15E148 Safari/604.1'))
        page = ctx.new_page()
        page.on('console', lambda m: noise.append(f'console.{m.type}: {m.text}')
                if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: noise.append(f'pageerror: {e}'))
        page.on('requestfailed', lambda r: noise.append(
            f'request failed: {r.url} — {r.failure}'))

        # ------------------------------------------------------------- boot
        print('\nboot')
        page.goto(BASE, wait_until='domcontentloaded')
        page.evaluate("localStorage.removeItem('wte.v1')")
        page.reload(wait_until='networkidle')
        page.wait_for_timeout(1600)
        check('boot veil lifted', page.locator('#boot').count() == 0)
        check('landed on home', top(page) == 'home')
        page.evaluate(AUDIT)

        # ------------------------------------------------------------- home
        print('\nhome')
        check('city is San Francisco', 'San Francisco' in page.locator('#app').inner_text())
        check('feed switch present', in_top(page, '[data-segkey]') == 2)
        check('the soon rail is a rail, not one card', in_top(page, '.rail .card') >= 2)
        check('event cards in feed', in_top(page, '[data-act="event"]') >= 6)
        check('a reason is given for the top pick',
              'going' in page.locator('#app').inner_text() or
              'Popular' in page.locator('#app').inner_text())
        check('five tabs', page.locator('#tabbar .tab').count() == 5)
        check('tab bar visible on a root', not page.locator('#tabbar').evaluate(
            "e=>e.classList.contains('hide')"))
        check('covers decoded', page.evaluate(
            "[...document.querySelectorAll('#app img')].filter(i=>i.naturalWidth>0).length") >= 4)
        audit(page, 'home')
        shot(page, '01-home')

        # switching the feed must not lose the screen
        tap(page, '[data-segkey="following"]')
        check('following feed renders', top(page) == 'home')
        tap(page, '[data-segkey="foryou"]')

        # ----------------------------------------------------------- detail
        print('\nevent detail')
        tap(page, '[data-act="event"]', 620)
        check('detail opened', top(page) == 'detail')
        check('tab bar hides on a pushed screen', page.locator('#tabbar').evaluate(
            "e=>e.classList.contains('hide')"))
        check('dock offers tickets', 'ticket' in dock(page).lower() or 'RSVP' in dock(page))
        check('when + where card', in_top(page, '.card') >= 1)
        check('host row with follow', in_top(page, '[data-act="followhost"]') == 1)
        check('tiers listed', 'Tickets' in page.locator('#app').inner_text()
              or 'Entry' in page.locator('#app').inner_text())
        check('a map schematic is drawn', in_top(page, 'svg') >= 3)
        audit(page, 'detail')
        shot(page, '02-detail')

        # ---------------------------------------------------------- booking
        print('\nbooking → checkout → ticket')
        tap(page, '#dock [data-act="book"]', 520)
        check('booking opened', top(page) == 'booking')
        before = dock(page)
        tap(page, '[data-act="qty"][data-d="1"]')
        check('quantity changes the running total', dock(page) != before, f'{before!r}')
        tap(page, '#dock [data-act="tocheckout"]', 520)
        check('checkout opened', top(page) == 'checkout')
        check('payment methods offered', in_top(page, '[data-act="method"]') == 3)
        check('fee line shown to non-members', 'Booking fee' in page.locator('#app').inner_text())
        audit(page, 'checkout')
        shot(page, '03-checkout')

        tap(page, '#dock [data-act="pay"]', 620)
        check('confirmed', top(page) == 'confirm')
        shot(page, '04-confirm')
        tap(page, '#dock [data-act="viewticket"]', 620)
        check('ticket pass opened', top(page) == 'ticket')
        check('a QR is drawn', in_top(page, '.qr') == 1)
        check('ticket carries a reference', bool(
            page.evaluate("document.querySelector('.pass').textContent.match(/WTE-\\d{6}/)")))
        audit(page, 'ticket')
        shot(page, '05-ticket')

        # --------------------------------------------------------- discover
        print('\ndiscover')
        tap(page, '[data-tab="discover"]', 520)
        check('discover opened', top(page) == 'discover')
        check('category grid', in_top(page, '[data-act="cat"]') >= 15)
        page.fill('#searchInput', 'yoga')
        page.wait_for_timeout(320)
        check('search narrows the list', 'result' in page.locator('#discoverBody').inner_text())
        page.fill('#searchInput', 'zzzznothing')
        page.wait_for_timeout(320)
        check('a dead search explains itself', 'No matches' in page.locator('#discoverBody').inner_text())
        tap(page, '[data-act="search:clear"]')
        tap(page, '[data-act="cat"][data-cat="Music"]', 480)
        check('category filter applies', 'Music' in page.locator('#discoverBody').inner_text())
        audit(page, 'discover')
        shot(page, '06-discover')

        # filters live in a sheet that must drag and close
        tap(page, '[data-act="filter:open"]', 620)
        check('filter sheet opened', page.locator('.sheet').count() == 1)
        check('sheet has a grabber', page.locator('.sheet .grabber').count() == 1)
        check('scrim dims the screen behind', page.locator('.scrim').count() == 1)
        check('the sheet takes focus, not its close button', page.evaluate(
            "document.activeElement === document.querySelector('.sheet')"))
        shot(page, '07-filters')
        tap(page, '.sheet [data-fkey="priceIdx"][data-fidx="1"]')
        tap(page, '.sheet [data-sheet-close]', 620)
        check('sheet dismissed', page.locator('.sheet').count() == 0)
        tap(page, '[data-act="filter:clear"]', 420)

        # --------------------------------------------------------- location
        print('\nlocation')
        tap(page, '[data-tab="home"]', 420)
        tap(page, '[data-act="picker"]', 700)
        check('location sheet opened', page.locator('.sheet').count() == 1)
        check('every country listed', page.locator('.sheet [data-widx]').count() >= 25)
        shot(page, '08-location')
        page.evaluate("(()=>{const w=document.querySelector('#wheel');"
                      "w.scrollTop=1*42;w.dispatchEvent(new Event('scroll'))})()")
        page.wait_for_timeout(320)
        check('changing country reloads its cities',
              'Dubai' in page.locator('#cityPanel').inner_text())
        tap(page, '[data-citypick="0"]')
        tap(page, '[data-loc="live"]', 700)
        check('city applied', 'Dubai' in page.locator('#app').inner_text())
        check('a generated city is populated', in_top(page, '[data-act="event"]') >= 6)
        # back to a city with hand-written copy for the rest of the run
        tap(page, '[data-act="picker"]', 620)
        page.evaluate("(()=>{const w=document.querySelector('#wheel');"
                      "w.scrollTop=0;w.dispatchEvent(new Event('scroll'))})()")
        page.wait_for_timeout(320)
        tap(page, '[data-citypick="0"]')
        tap(page, '[data-loc="live"]', 700)

        # ------------------------------------------------------------- chat
        print('\nchat')
        tap(page, '[data-tab="chat"]', 520)
        check('chat opened', top(page) == 'chat')
        check('conversations listed', in_top(page, '[data-act="thread"]') >= 8)
        tap(page, '[data-act="thread"]', 620)
        check('thread opened', top(page) == 'thread')
        n0 = in_top(page, '.bub')
        page.fill('#msgInput', 'see you at 8')
        tap(page, '[data-act="send"]', 520)
        check('my message appears', in_top(page, '.bub') > n0)
        page.wait_for_timeout(1700)
        check('they reply', in_top(page, '.bub') > n0 + 1)
        audit(page, 'thread')
        shot(page, '09-thread')

        # ---------------------------------------------------------- profile
        print('\nprofile + publishing')
        tap(page, '[data-tab="profile"]', 520)
        check('profile opened', top(page) == 'profile')
        check('three profile tabs', in_top(page, '[data-segkey]') == 3)
        check('publish CTA present', in_top(page, '[data-act="create"]') == 1)
        audit(page, 'profile')
        shot(page, '10-profile')

        tap(page, '[data-act="create"]', 520)
        check('create opened', top(page) == 'create')
        check('continue is blocked until there is a title', page.evaluate(
            "document.querySelector('#dock [data-act=\"c:next\"]').disabled"))
        page.fill('[data-input="c_title"]', 'Rooftop Sessions Vol. 1')
        page.wait_for_timeout(200)
        check('a title unblocks it', not page.evaluate(
            "document.querySelector('#dock [data-act=\"c:next\"]').disabled"))
        tap(page, '#dock [data-act="c:next"]', 420)
        tap(page, '[data-act="c:date"]')
        tap(page, '[data-act="c:time"]')
        tap(page, '#dock [data-act="c:next"]', 420)
        page.fill('[data-input="c_venue"]', 'The Terrace')
        page.wait_for_timeout(180)
        tap(page, '#dock [data-act="c:next"]', 420)
        check('reached the last step',
              '4 of 4' in page.locator('#app').inner_text().lower())
        tap(page, '[data-act="c:paid"]', 420)
        page.fill('[data-input="c_price"]', '30')
        page.wait_for_timeout(260)
        check('the preview tracks the price live',
              page.evaluate("document.querySelector('#previewPrice').textContent") == '$30')
        check('the payout is money, not the word Free',
              page.evaluate("document.querySelector('#payoutValue').textContent") == '$28.20')
        shot(page, '11-create')
        tap(page, '#dock [data-act="c:publish"]', 620)
        check('published', top(page) == 'published')
        tap(page, '#dock [data-act="viewpublished"]', 620)
        check('the published event opens', top(page) == 'detail')
        check('it carries the title given',
              'Rooftop Sessions Vol. 1' in page.locator('#app').inner_text())

        # --------------------------------------------------------- premium
        print('\nmembership + settings')
        tap(page, '[data-tab="profile"]', 480)
        tap(page, '[data-act="premium"]', 520)
        check('membership opened', top(page) == 'premium')
        audit(page, 'premium')
        shot(page, '12-premium')
        tap(page, '#dock [data-act="subscribe"]', 620)
        check('subscribing returns you to your profile', top(page) == 'profile')
        check('the member badge appears', 'Member' in page.locator('#app').inner_text())

        tap(page, '[data-act="settings"]', 520)
        check('settings opened', top(page) == 'settings')
        check('settings groups present', in_top(page, '[data-act="set"]') >= 8)
        tap(page, '[data-act="set"][data-key="Privacy"]', 480)
        check('a settings sub-page opens', 'Privacy & safety' in page.locator('#app').inner_text())
        check('the bar names the sub-page, not "Settings"',
              page.locator('#topbar .topbar-title').inner_text().strip() == 'Privacy & safety')
        tap(page, '[data-act="set"][data-key="Blocked"]', 480)
        check('an empty list explains itself', in_top(page, '.empty') == 1)
        audit(page, 'settings')
        shot(page, '13-settings')

        # --------------------------------------------------------- back nav
        print('\nnavigation')
        tap(page, '[data-act="back"]', 480)
        check('back climbs the settings tree', 'Privacy & safety' in page.locator('#app').inner_text())
        tap(page, '[data-act="back"]', 480)
        tap(page, '[data-act="back"]', 480)
        check('back returns to the profile root', top(page) == 'profile')
        check('the tab bar comes back', not page.locator('#tabbar').evaluate(
            "e=>e.classList.contains('hide')"))

        # a double-tap must open one screen, not two
        tap(page, '[data-tab="home"]', 420)
        page.evaluate("(()=>{const e=document.querySelector('[data-act=\"event\"]');"
                      "e.click();e.click()})()")
        page.wait_for_timeout(620)
        check('a double-tap opens one screen', page.evaluate(
            "document.querySelectorAll('#app .screen').length") == 2)

        # ------------------------------------------------------ persistence
        print('\npersistence + PWA')
        saved_before = page.evaluate("JSON.parse(localStorage.getItem('wte.v1')).saved.length")
        page.reload(wait_until='networkidle')
        page.wait_for_timeout(1400)
        check('state survives a reload', page.evaluate(
            "JSON.parse(localStorage.getItem('wte.v1')).saved.length") == saved_before)
        check('membership survives a reload', page.evaluate(
            "JSON.parse(localStorage.getItem('wte.v1')).member") is True)
        check('tickets survive a reload', page.evaluate(
            "JSON.parse(localStorage.getItem('wte.v1')).myTickets.length") >= 1)

        man = ctx.request.get(f'{BASE}/manifest.webmanifest')
        check('manifest served', man.ok)
        m = man.json()
        check('manifest is standalone', m.get('display') == 'standalone')
        check('manifest is Ink', m.get('theme_color') == '#0B0A0C')
        check('manifest has a maskable icon',
              any(i.get('purpose') == 'maskable' for i in m.get('icons', [])))
        check('manifest offers shortcuts', len(m.get('shortcuts', [])) >= 3)
        check('service worker served', ctx.request.get(f'{BASE}/sw.js').ok)

        # ------------------------------------------------- reduced motion
        print('\nreduced motion')
        ctx2 = browser.new_context(viewport=VIEW, device_scale_factor=2,
                                   is_mobile=True, has_touch=True,
                                   reduced_motion='reduce')
        p2 = ctx2.new_page()
        p2.goto(BASE, wait_until='networkidle')
        p2.wait_for_timeout(1400)
        check('reduced motion still boots', p2.locator('#boot').count() == 0)
        p2.evaluate("(()=>{const e=document.querySelector('[data-act=\"event\"]');e.click()})()")
        p2.wait_for_timeout(400)
        check('reduced motion navigates without a spring', p2.evaluate(
            "(()=>{const s=[...document.querySelectorAll('#app .screen')].pop();"
            "return s.dataset.screen})()") == 'detail')
        ctx2.close()

        browser.close()

    print(f'\n{ok} checks passed, {len(bad)} failed')
    if bad:
        print('\nFAILURES')
        for b in bad:
            print('  ' + b)

    # Unsplash is hotlinked on purpose; a remote 404 falls back to the gradient.
    hard = [n for n in noise if 'images.unsplash.com' not in n]
    if hard:
        print('\nCONSOLE / NETWORK')
        for n in dict.fromkeys(hard):
            print('  ' + n)
    soft = len(noise) - len(hard)
    if soft:
        print(f'\n({soft} remote-image warnings ignored — the gradient is the fallback)')

    return 1 if (bad or hard) else 0


if __name__ == '__main__':
    sys.exit(run('--shots-only' in sys.argv))
