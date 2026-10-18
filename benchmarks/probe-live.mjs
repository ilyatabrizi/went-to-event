import dotenv from '../apps/api/node_modules/dotenv/lib/main.js'
dotenv.config({path:new URL('../apps/api/.env',import.meta.url).pathname,quiet:true})
for(const url of ['https://wenttoevent.com/','https://wenttoevent.com/demo','https://api-orcin-one-49.vercel.app/health','https://api-orcin-one-49.vercel.app/events']) {
 const start=performance.now()
 try { const r=await fetch(url,{signal:AbortSignal.timeout(15000)}); const body=await r.text(); let records; try { records=JSON.parse(body).data?.length } catch {} console.log(JSON.stringify({url,status:r.status,ms:performance.now()-start,bytes:Buffer.byteLength(body),cache:r.headers.get('x-vercel-cache'),records})) } catch(e) {console.log(JSON.stringify({url,error:e.message,cause:e.cause?.code}))}
}
console.log(JSON.stringify({supabaseConfigured:!!process.env.SUPABASE_URL,keyConfigured:!!process.env.SUPABASE_SERVICE_ROLE_KEY}))
if(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY){
 const url=new URL('/rest/v1/events',process.env.SUPABASE_URL);url.searchParams.set('select','id,category,title,description,starts_at,ends_at,host_name,going_count,venue:venues(name,address,latitude,longitude),ticketTiers:ticket_tiers(id,name,description,price_cents)');url.searchParams.set('ends_at','gt.'+new Date().toISOString());url.searchParams.set('host_user_id','not.is.null');url.searchParams.set('order','starts_at.asc')
 try{const r=await fetch(url,{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY},signal:AbortSignal.timeout(15000)});const body=await r.json();console.log(JSON.stringify({target:'Direct Supabase repository query',status:r.status,records:Array.isArray(body)?body.length:null,errorCode:body.code}))}catch(e){console.log(JSON.stringify({target:'Direct Supabase',error:e.message,cause:e.cause?.code}))}
}
