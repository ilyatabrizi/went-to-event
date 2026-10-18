import { fork } from 'node:child_process'
import http from 'node:http'
import os from 'node:os'
import { writeFile, mkdir } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
const child = fork(new URL('./local-server.mjs', import.meta.url), { silent: true })
child.stderr.on('data', d => process.stderr.write(d))
const next = () => new Promise((resolve, reject) => {
  const message = value => { cleanup(); resolve(value) }
  const fail = value => { cleanup(); reject(new Error(`Benchmark server stopped: ${value}`)) }
  const cleanup = () => { child.off('message', message); child.off('error', fail); child.off('exit', fail) }
  child.once('message', message); child.once('error', fail); child.once('exit', fail)
})
const ready = await next()
const dir = new URL(`./local-${new Date().toISOString().replaceAll(':','-')}/`, import.meta.url)
await mkdir(dir, { recursive: true })
const agent = new http.Agent({ keepAlive: true, maxSockets: 2500 })
const routes = [ ['Events list', ready.api, '/events'], ['Event detail', ready.api, '/events/bench-1'], ['App HTML', ready.web, '/'], ...ready.assets.map(p => ['Static '+p.split('/').pop(), ready.web, p]) ]
const samples = [], stages = []
const percentile = (a, p) => a[Math.max(0, Math.ceil(a.length*p)-1)] ?? 0
function request(route) {
  return new Promise(resolve => {
    const start = performance.now(); let bytes = 0, chunks = [], done = false
    const finish = (status, error) => { if (done) return; done = true; resolve({ endpoint: route[0], ms: performance.now()-start, status, error, bytes }) }
    const req = http.get({ hostname: '127.0.0.1', port: route[1], path: route[2], agent }, res => {
      res.on('data', d => { bytes += d.length; if (route[1] === ready.api) chunks.push(d) })
      res.on('error', e => finish(res.statusCode, e.message))
      res.on('end', () => {
        let error = res.statusCode === 200 ? null : `HTTP ${res.statusCode}`
        if (!error && route[1] === ready.api) try { const json = JSON.parse(Buffer.concat(chunks)); if (route[2] === '/events' ? json.data?.length !== 100 : json.data?.id !== 'bench-1') error = 'Response validation failed' } catch { error = 'Invalid JSON' }
        finish(res.statusCode, error)
      })
    })
    req.setTimeout(5000, () => req.destroy(new Error('5s timeout')))
    req.on('error', e => finish(null, e.message))
  })
}
try {
  for (const r of routes) await request(r)
  const plans = [...[10,100,250,500,1000].map(users => ({ mode:'Browsing', users, seconds:20, thinkMs:1000 })), ...[100,1000,2000].map(users => ({ mode:'Stress', users, seconds:15, thinkMs:0 }))]
  for (const plan of plans) {
    const id = stages.length+1, start = performance.now(), deadline = start+plan.seconds*1000, data=[]
    child.send('stats'); await next()
    await Promise.all(Array.from({ length: plan.users }, async (_, user) => {
      // Stagger arrivals over one second. Browsing: 60% list, 30% detail, 10% document/asset.
      await sleep(user/plan.users*1000)
      let step=user
      while(performance.now()<deadline && data.length<60000) {
        const n=step++%10, route=n<6?routes[0]:n<9?routes[1]:routes[2+(step% (routes.length-2))]
        const result=await request(route); data.push({stage:id, user:user+1,...result})
        if(plan.thinkMs) await sleep(plan.thinkMs)
      }
    }))
    const elapsed=(performance.now()-start)/1000
    child.send('stats'); const stats=await next()
    const latencies=data.map(x=>x.ms).sort((a,b)=>a-b), errors=data.filter(x=>x.error).length
    const stage={id,...plan,elapsed,requests:data.length,errors,rps:data.length/elapsed,meanMs:latencies.reduce((a,b)=>a+b,0)/data.length,p50Ms:percentile(latencies,.5),p95Ms:percentile(latencies,.95),p99Ms:percentile(latencies,.99),maxMs:latencies.at(-1),bytes:data.reduce((a,b)=>a+b.bytes,0),...stats}
    stages.push(stage); samples.push(...data)
    console.log(JSON.stringify(stage))
    await writeFile(new URL('results.json',dir), JSON.stringify({ generatedAt:new Date().toISOString(), environment:{ node:process.version,platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0].model,logicalCpus:os.cpus().length,memoryGB:os.totalmem()/1073741824 }, fixtureEvents:100, routes, stages, samples }))
    if(errors/data.length>.05 || stage.p95Ms>5000) { console.log('Stopped: error/latency safety threshold exceeded'); break }
    await sleep(1500)
  }
  console.log('RESULTS '+new URL('results.json',dir).pathname)
} finally { agent.destroy(); child.kill() }
