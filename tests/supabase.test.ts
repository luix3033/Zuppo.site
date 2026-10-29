import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseCatalog, mapSupabaseOffer} from '../worker/supabase.js';
import {createHandler} from '../worker/index.js';
const config = {CATALOG_PROVIDER:'supabase',SUPABASE_URL:'https://catalog.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
const row = {id:'db-offer',product:{name:'Produto real',description:'Descrição',category_id:'games',image_url:'https://example.com/image.webp',specs:{}},marketplace_id:'amazon',current_price_cents:12999,previous_price_cents:19990,affiliate_url:'https://example.com/buy',status:'active',available:true,featured:true,flash:false,source:'manual',published_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z',expires_at:null};
test('Supabase maps cents, nullable prices and the current Offer contract',()=>{
 const offer=mapSupabaseOffer(row); assert.equal(offer.currentPrice,129.99); assert.equal(offer.previousPrice,199.9); assert.equal(offer.store,'amazon'); assert.equal(offer.isDemo,false);
 assert.equal(mapSupabaseOffer({...row,previous_price_cents:null}).previousPrice,undefined);
 assert.throws(()=>mapSupabaseOffer({...row,current_price_cents:'NaN'}));
});
test('Supabase asks SQL for exactly one page and forwards combined typed filters with public credentials',async()=>{
 const calls:any[]=[];
 const catalog=createSupabaseCatalog(config,async(url,init)=>{
  const u=new URL(url);calls.push({url:u,body:JSON.parse(init.body)});
  assert.equal(init.headers.apikey,config.SUPABASE_PUBLISHABLE_KEY);assert.equal(init.headers.Authorization,undefined);assert.equal(init.cache,'no-store');
  assert.equal(init.method,'POST');return Response.json({items:[row],total:401,page:2,limit:1,totalPages:401});
 });
 const result=await catalog.query(new URLSearchParams('limit=1&page=2&category=games&store=amazon&minDiscount=20&sort=price-asc'));
 assert.equal(result.total,401);assert.equal(result.items[0].currentPrice,129.99);assert.equal(calls.length,1);
 assert.equal(calls[0].url.pathname,'/rest/v1/rpc/zuppo_query_offers');assert.equal(calls[0].body.filters.category,'games');assert.equal(calls[0].body.filters.store,'amazon');assert.equal(calls[0].body.filters.page,2);assert.equal(calls[0].body.filters.maxPrice,undefined);
});
test('Supabase never returns unsafe destinations, expired records, or a partial result after an outage',async()=>{
 const catalog=createSupabaseCatalog(config,async url=>Response.json(new URL(url).pathname.includes('/rpc/')?{items:[{...row,affiliate_url:'javascript:bad'},{...row,expires_at:'2000-01-01T00:00:00Z'}],total:2,page:1,limit:100,totalPages:1}:[{...row,affiliate_url:'javascript:bad'}]));
 assert.deepEqual(await catalog.list(),[]);
 assert.equal(await catalog.find('bad'),null);
 const offline=createSupabaseCatalog(config,async()=>new Response('private diagnostics',{status:500}));
 await assert.rejects(offline.list(),/temporariamente indisponível/);
 assert.throws(()=>createSupabaseCatalog({...config,SUPABASE_PUBLISHABLE_KEY:'sb_secret_bad'}));
});
test('Supabase backs public routes and redirects; legacy identity cannot change the SQL catalog',async t=>{
 const previous=globalThis.fetch; t.after(()=>{globalThis.fetch=previous});
 let requests=0;
 globalThis.fetch=async url=>{requests++;const u=new URL(url);return Response.json(u.pathname.includes('/rpc/')?{items:[row],total:1,page:1,limit:12,totalPages:1}:[row])};
 const events:any[]=[];
 const env={...config,DEV_AUTH_ENABLED:true,DEV_ADMIN_EMAIL:'owner@example.com',BUCKET:{put:async(...args)=>events.push(args),list:async()=>({objects:[]})}};
 const handler=createHandler({});
 const call=(path,method='GET',body?)=>handler.fetch(new Request('https://site.test'+path,{method,headers:{Origin:'https://site.test','x-zuppo-dev-email':'owner@example.com','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
 const list=await call('/api/offers?limit=12'); assert.equal(list.status,200); assert.equal((await list.json()).total,1);assert.equal(list.headers.get('cache-control'),'no-store');
 assert.equal((await(await call('/api/offers/db-offer')).json()).currentPrice,129.99);
 const redirect=await call('/go/db-offer');assert.equal(redirect.status,302);assert.equal(redirect.headers.get('Location'),row.affiliate_url);assert.equal(events.length,1);
 assert.equal((await call('/api/events','POST',{type:'view',productId:row.id})).status,200);
 assert.equal((await call('/api/admin/offers/db-offer','PUT',{})).status,401);
 assert.equal((await call('/api/admin/media/any.webp','DELETE')).status,401);
 assert.equal(events.length,2);assert.ok(requests>0);
 globalThis.fetch=async()=>new Response('sensitive remote error',{status:500});
 const failed=await call('/api/offers');assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('sensitive'));
});
