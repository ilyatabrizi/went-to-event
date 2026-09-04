/* Two strategies, on purpose.

   Same-origin app files: NETWORK-FIRST, cache as fallback. Cache-first is the
   usual advice and it is a trap here — once a build is cached, an edit never
   reaches anyone until the cache name changes, and a stale shell paired with a
   fresh module is worse than being offline. Network-first costs one fast
   request on a good connection and still works with no connection at all.

   Remote cover images: CACHE-FIRST. They never change at a given URL, they are
   the expensive part, and caching them is what makes the app usable on a plane. */

const V = 'wte-v1';
const IMGS = 'wte-img-v1';
const MARK = '__wte_install_kind__';

const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/router.js', './js/store.js', './js/util.js', './js/icons.js',
  './js/ui/motion.js', './js/ui/sheet.js', './js/ui/toast.js', './js/ui/parts.js', './js/ui/haptics.js',
  './js/data/geo.js', './js/data/people.js', './js/data/events.js',
  './js/views/home.js', './js/views/discover.js', './js/views/pickers.js', './js/views/detail.js',
  './js/views/booking.js', './js/views/tickets.js', './js/views/chat.js', './js/views/profile.js',
  './js/views/settings.js', './js/views/create.js',
  './assets/icons/favicon_192.png', './assets/icons/favicon_512.png',
  './assets/icons/e_icon_rounded_512.png', './assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    /* Was a worker here before us? An existing cache is the only durable
       signal, so record the answer in the cache rather than a variable — an
       install and its activate are not guaranteed to run in the same worker
       instance. */
    const cold = (await caches.keys()).length === 0;
    const c = await caches.open(V);
    await Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' }))));
    await c.put(MARK, new Response(cold ? 'cold' : 'update'));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== V && k !== IMGS).map(k => caches.delete(k)));

    /* Claim clients only when REPLACING a worker. Claiming on a first install
       hijacks requests the page already had in flight — on a first visit that
       killed every cover image mid-flight. On a cold install control passes at
       the next navigation, which is soon enough and costs nothing. If the
       marker is missing we assume cold, because that is the safe direction. */
    const c = await caches.open(V);
    const mark = await c.match(MARK);
    if (mark && (await mark.text()) === 'update') await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'images.unsplash.com') {
    e.respondWith(caches.open(IMGS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      } catch { return Response.error(); }
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(V).then(c => c.put(req, copy));
      }
      return res;
    } catch {
      const hit = await caches.match(req);
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
