import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { monitorEventLoopDelay } from 'node:perf_hooks'
process.env.SUPABASE_URL = ''
process.env.SUPABASE_SERVICE_ROLE_KEY = ''
process.env.RESEND_API_KEY = ''
process.env.NODE_ENV = 'test'
const { buildApp } = await import('../apps/api/dist/src/app.js')
const { events } = await import('../apps/api/dist/src/data/events.js')
const catalogue = Array.from({ length: 100 }, (_, i) => ({ ...events[i % events.length], id: `bench-${i}`, startsAt: '2027-01-01T18:00:00Z', endsAt: '2027-01-01T23:00:00Z' }))
const app = buildApp({ list: async () => catalogue, getById: async id => catalogue.find(e => e.id === id) ?? null }, null, null, null, null, null, null)
await app.listen({ host: '127.0.0.1', port: 0 })
const root = new URL('../apps/web/dist/', import.meta.url)
const files = new Map([['/', await readFile(new URL('index.html', root))]])
for (const entry of await readdir(new URL('assets/', root), { withFileTypes: true })) if (entry.isFile()) files.set(`/assets/${entry.name}`, await readFile(new URL(`assets/${entry.name}`, root)))
const web = createServer((req, res) => { const data = files.get(req.url); res.writeHead(data ? 200 : 404); res.end(data ?? 'Not found') })
await new Promise(resolve => web.listen(0, '127.0.0.1', resolve))
const lag = monitorEventLoopDelay({ resolution: 20 }); lag.enable()
let lastCpu = process.cpuUsage(), lastTime = performance.now()
process.on('message', message => {
  if (message === 'stats') {
    const now = performance.now(), cpu = process.cpuUsage(), elapsed = now - lastTime
    process.send({ type: 'stats', cpuPercent: ((cpu.user-lastCpu.user+cpu.system-lastCpu.system)/1000)/elapsed*100, rssMB: process.memoryUsage().rss/1048576, loopP99Ms: lag.percentile(99)/1e6 })
    lastCpu = cpu; lastTime = now; lag.reset()
  }
})
process.send({ type: 'ready', api: app.server.address().port, web: web.address().port, assets: [...files.keys()].filter(x => x.endsWith('.js') || x.endsWith('.css')), events: catalogue.length })
