import dotenv from '../apps/api/node_modules/dotenv/lib/main.js'
dotenv.config({path:new URL('../apps/api/.env',import.meta.url).pathname,quiet:true})
const q=new URL('/rest/v1/events',process.env.SUPABASE_URL)
q.searchParams.set('select','id');q.searchParams.set('limit','1')
const headers={apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'user-agent':'WentToEvent-owner-benchmark/2.0'}
try{const t=performance.now();const r=await fetch(q,{headers,signal:AbortSignal.timeout(10000)});await r.arrayBuffer();console.log(JSON.stringify({status:r.status,ms:performance.now()-t}))}catch(e){console.log(JSON.stringify({name:e.name,message:e.message,causeCode:e.cause?.code,causeMessage:e.cause?.message}))}
