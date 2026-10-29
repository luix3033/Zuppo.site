import {enforceRateLimit} from './request-security.js';
const seen=new Map();
let salt;
async function eventFingerprint(request,productId,type){
  salt ||= crypto.randomUUID();
  const address=request.headers.get('cf-connecting-ip')||'local';
  const bytes=new TextEncoder().encode(salt+'|'+address+'|'+productId+'|'+type);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
}
export async function recordEvent(request,env,type,productId){
  const key=await eventFingerprint(request,productId,type),now=Date.now();
  if((seen.get(key)||0)>now)return false;
  await enforceRateLimit(request,env,{binding:'EVENT_RATE_LIMITER',keyPrefix:'events',limit:60,windowMs:60000});
  if(seen.size>=2000){for(const [k,expiry] of seen){if(expiry<=now)seen.delete(k);}if(seen.size>=2000)seen.delete(seen.keys().next().value);}
  seen.set(key,now+60000);
  try{
    await env.BUCKET.put('events/'+new Date(now).toISOString()+'/'+crypto.randomUUID(),JSON.stringify({type,productId,at:new Date(now).toISOString(),verified:true}));
    return true;
  }catch(error){seen.delete(key);throw error;}
}
export async function readStats(db,offers){
  const start=new Date(Date.now()-30*86400000).toISOString();
  const list=await db.list({prefix:'events/',startAfter:'events/'+start,limit:1000});
  const events=await Promise.all(list.objects.map(async o=>{const item=await db.get(o.key);return item?item.json():null;}));
  const eligible=new Set(offers.map(o=>o.id));
  const tracked=events.filter(e=>e&&['view','click'].includes(e.type)&&typeof e.productId==='string'&&(e.verified===true||eligible.has(e.productId)));
  const products=Object.create(null);
  for(const e of tracked){products[e.productId]??={views:0,clicks:0};products[e.productId][e.type==='view'?'views':'clicks']++;}
  return {events:tracked.length,totalOffers:offers.length,views:tracked.filter(e=>e.type==='view').length,clicks:tracked.filter(e=>e.type==='click').length,products,limited:!!list.truncated};
}
