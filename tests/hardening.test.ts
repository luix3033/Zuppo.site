import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../worker/index.js';
import {recordEvent,readStats} from '../worker/tracking.js';

test('security headers apply to assets, API errors and authentication responses without merging cookies',async()=>{
 const handler=createHandler({});
 const env={ASSETS:{fetch:async()=>new Response('<html>site</html>',{headers:{'Content-Type':'text/html'}})}};
 const root=await handler.fetch(new Request('https://zuppo.example/ofertas'),env);
 assert.equal(root.status,200);assert.match(root.headers.get('Content-Security-Policy'),/frame-ancestors 'self'/);assert.equal(root.headers.get('X-Frame-Options'),'SAMEORIGIN');assert.equal(root.headers.get('X-Content-Type-Options'),'nosniff');
 const denied=await handler.fetch(new Request('https://zuppo.example/api/admin/offers'),env);assert.equal(denied.status,403);assert.match(denied.headers.get('content-type'),/json/);assert.equal(denied.headers.get('Permissions-Policy'),'camera=(), microphone=(), geolocation=(), payment=()');
 const internal=await handler.fetch(new Request('https://zuppo.example/server/index.js'),env);assert.equal(internal.status,404);
 const health=await handler.fetch(new Request('https://zuppo.example/healthz'),env);assert.equal(health.status,503);assert.equal((await health.json()).status,'configuration_required');
});
test('configured rate limiting rejects expensive public catalog work before reaching storage',async()=>{
 let read=false;
 const handler=createHandler({});
 const env={CATALOG_RATE_LIMITER:{limit:async()=>({success:false})},BUCKET:{list:async()=>{read=true;return {objects:[]}}}};
 const r=await handler.fetch(new Request('https://limited.example/api/offers?limit=12'),env);
 assert.equal(r.status,429);assert.ok(Number(r.headers.get('Retry-After'))>0);assert.equal(read,false);
});
test('repeated interaction writes are suppressed and persistent events contain no network identity',async()=>{
 const writes:any[]=[];
 const env={BUCKET:{put:async(key,value)=>writes.push({key,value:JSON.parse(value)})}};
 const request=new Request('https://tracking.example/api/events',{headers:{'cf-connecting-ip':'192.0.2.74'}});
 assert.equal(await recordEvent(request,env,'view','hardening-offer'),true);
 assert.equal(await recordEvent(request,env,'view','hardening-offer'),false);
 assert.equal(writes.length,1);assert.deepEqual(Object.keys(writes[0].value).sort(),['at','productId','type','verified']);assert.ok(!JSON.stringify(writes).includes('192.0.2.74'));
});
test('statistics treat offer IDs as data rather than inherited object properties',async()=>{
 const db={list:async()=>({objects:[{key:'event'}],truncated:false}),get:async()=>({json:async()=>({type:'view',productId:'__proto__',verified:true})})};
 const stats=await readStats(db,[]);assert.equal(stats.products['__proto__'].views,1);assert.equal(stats.products['__proto__'].clicks,0);assert.equal(Object.getPrototypeOf(stats.products),null);
});
