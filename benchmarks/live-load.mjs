import dotenv from '../apps/api/node_modules/dotenv/lib/main.js'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
import { createHash } from 'node:crypto'
import os from 'node:os'
dotenv.config({path:new URL('../apps/api/.env',import.meta.url).pathname,quiet:true})
const site='https://wenttoevent.com', api='https://api-orcin-one-49.vercel.app'
const key=process.env.SUPABASE_SERVICE_ROLE_KEY, dbHost=new URL(process.env.SUPABASE_URL).host
if(!key) throw new Error('Supabase credentials unavailable')
const query=new URL('/rest/v1/events',process.env.SUPABASE_URL)
query.searchParams.set('select','id,category,title,description,starts_at,ends_at,host_name,going_count,venue:venues(name,address,latitude,longitude),ticketTiers:ticket_tiers(id,name,description,price_cents)')
query.searchParams.set('ends_at','gt.'+new Date().toISOString());query.searchParams.set('host_user_id','not.is.null');query.searchParams.set('order','starts_at.asc')
const targets=[{name:'Vercel home HTML',url:site+'/',kind:'html'},{name:'Vercel app HTML',url:site+'/demo',kind:'html'},{name:'Vercel events API',url:api+'/events',kind:'api'},{name:'Supabase direct events read',url:query.href,kind:'database',headers:{apikey:key,Authorization:'Bearer '+key}}]
const controlled=process.env.BENCHMARK_CONTROLLED==='1'
const apiOnly=process.env.BENCHMARK_TARGET==='api'
const selectedTargets=apiOnly?[targets[2]]:controlled?[targets[3],targets[2]]:targets
const output=new URL(`./live-${controlled?'controlled-':''}${new Date().toISOString().replaceAll(':','-')}/`,import.meta.url)
await mkdir(output,{recursive:true})
let active=0, peakActive=0, total=0
let reserved=0
const percentile=(a,p)=>a[Math.max(0,Math.ceil(a.length*p)-1)]??0
async function request(target,deadline=Infinity,cancelled=()=>false){
 const start=performance.now()
 if(controlled){while(reserved>=64){if(performance.now()>=deadline||cancelled())return null;await sleep(10)}if(performance.now()>=deadline||cancelled())return null;reserved++}
 const wireStart=performance.now();active++;peakActive=Math.max(peakActive,active);total++
 const sample={target:target.name,status:null,ms:0,bytes:0,cache:null,records:null,error:null,startedAt:new Date().toISOString()}
 try{
  const r=await fetch(target.url,{headers:{'user-agent':'WentToEvent-owner-benchmark/2.0',...target.headers},signal:AbortSignal.timeout(10000)})
  sample.status=r.status;sample.cache=r.headers.get('x-vercel-cache');const body=await r.text();sample.bytes=Buffer.byteLength(body)
  if(!r.ok) sample.error=`HTTP ${r.status}`
  else if(target.kind==='html'){if(!body.toLowerCase().includes('<html')) sample.error='Invalid HTML'}
  else {const json=JSON.parse(body),records=target.kind==='api'?json.data:json;if(!Array.isArray(records))sample.error='Invalid event array';else sample.records=records.length}
 }catch(e){sample.error=e.name+': '+e.message;sample.causeCode=e.cause?.code??null}
 finally{sample.ms=performance.now()-start;sample.queueMs=wireStart-start;sample.wireMs=performance.now()-wireStart;active--;if(controlled)reserved--}
 return sample
}
const idHash=records=>createHash('sha256').update(JSON.stringify(records.map(x=>x.id).sort())).digest('hex')
const publicResponse=await fetch(api+'/events',{signal:AbortSignal.timeout(15000)}), publicData=await publicResponse.json()
const dbResponse=apiOnly?null:await fetch(query,{headers:targets[3].headers,signal:AbortSignal.timeout(15000)}), dbData=apiOnly?null:await dbResponse.json()
if(!publicResponse.ok||!Array.isArray(publicData.data)||(!apiOnly&&(!dbResponse.ok||!Array.isArray(dbData))))throw new Error('Preflight response invalid')
if(!apiOnly&&idHash(publicData.data)!==idHash(dbData))throw new Error('API and configured Supabase event IDs differ; stop to verify deployment')
const preflight={apiRecords:publicData.data.length,databaseRecords:dbData?.length??null,eventIdHashesMatch:apiOnly?null:true,supabaseHost:dbHost,api:api+'/events',site}
const html=await(await fetch(site+'/demo',{signal:AbortSignal.timeout(15000)})).text()
const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(x=>new URL(x[1],site).href)
const hosts=new Set()
for(const url of scripts){const body=await(await fetch(url,{signal:AbortSignal.timeout(15000)})).text();for(const m of body.matchAll(/https:\/\/([a-z0-9-]+\.supabase\.co)/g))hosts.add(m[1])}
preflight.browserSupabaseHostMatches=hosts.has(dbHost)
if(hosts.size&&!hosts.has(dbHost))throw new Error('Browser Supabase host differs from local configuration')
console.log(JSON.stringify({preflight}))
const stages=[],samples=[];let stoppedReason=null
for(const target of selectedTargets){
 for(const users of [100,1000]){
  if(stoppedReason)break
  const warmup=await request(target);if(warmup.error){stoppedReason=`Preflight failed for ${target.name}: ${warmup.error}`;break}
  const id=stages.length+1,start=performance.now(),deadline=start+20000,rows=[];let abort=false,errorCount=0;peakActive=0
  const runnerCpu=process.cpuUsage()
  await Promise.all(Array.from({length:users},async(_,user)=>{
   await sleep(user/users*5000)
   while(performance.now()<deadline&&!abort&&total<18000){
    const s=await request(target,deadline,()=>abort);if(!s)break;rows.push({stage:id,user:user+1,...s});if(s.error)errorCount++
    if(s.status===429||s.status>=500){abort=true;stoppedReason=`HTTP ${s.status} observed in ${target.name}`}
    if(rows.length>=50&&errorCount/rows.length>.02){abort=true;stoppedReason='Stage error rate exceeded 2%'}
    if(rows.length>=50&&rows.filter(x=>x.wireMs>5000).length/rows.length>.1){abort=true;stoppedReason='More than 10% of wire responses exceeded five seconds'}
    const wait=Math.max(0,5000-s.ms);if(wait)await sleep(Math.min(wait,Math.max(0,deadline-performance.now())))
   }
  }))
  const elapsed=(performance.now()-start)/1000,times=rows.map(x=>x.ms).sort((a,b)=>a-b),cpu=process.cpuUsage(runnerCpu)
  const statuses={},caches={},recordCounts={};for(const r of rows){statuses[r.status??'network']=(statuses[r.status??'network']??0)+1;caches[r.cache??'none']=(caches[r.cache??'none']??0)+1;if(r.records!==null)recordCounts[r.records]=(recordCounts[r.records]??0)+1}
  const stage={id,target:target.name,users,seconds:20,rampSeconds:5,requestIntervalSeconds:5,elapsed,requests:rows.length,errors:errorCount,rps:rows.length/elapsed,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p50Ms:percentile(times,.5),p95Ms:percentile(times,.95),p99Ms:percentile(times,.99),maxMs:times.at(-1),p95WireMs:percentile(rows.map(x=>x.wireMs).sort((a,b)=>a-b),.95),p95QueueMs:percentile(rows.map(x=>x.queueMs).sort((a,b)=>a-b),.95),bytes:rows.reduce((a,b)=>a+b.bytes,0),peakInFlight:peakActive,inFlightLimit:controlled?64:null,runnerCpuPercent:(cpu.user+cpu.system)/1000/(elapsed*1000)*100,statuses,caches,recordCounts,stoppedReason}
  stages.push(stage);samples.push(...rows)
  const result={generatedAt:new Date().toISOString(),preflight,controlled,method:'Read-only production HTTP benchmark; 100 and 1,000 staggered virtual users per target, five-second request interval, 20-second stages, five-second ramp. No writes, no cache busting, no retries. 18,000-request overall cap. Controlled mode limits in-flight requests to 64 and records queue delay.',runner:{node:process.version,platform:os.platform(),cpu:os.cpus()[0].model},stoppedReason,stages,samples}
  await writeFile(new URL('results.json',output),JSON.stringify(result))
  console.log(JSON.stringify(stage));await sleep(2000)
 }
 if(stoppedReason)break
}
await writeFile(new URL('results.json',output),JSON.stringify({generatedAt:new Date().toISOString(),preflight,controlled,runner:{node:process.version,platform:os.platform(),cpu:os.cpus()[0].model},stoppedReason,stages,samples}))
console.log('RESULTS '+new URL('results.json',output).pathname)
