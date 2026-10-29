import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCatalogQuery,createSupabaseCatalog} from '../worker/supabase.js';
import {queryOffers,publicOffer} from '../worker/offers.js';
import {offerRepository,catalogSearchParams} from '../src/lib/repository';
const config={SUPABASE_URL:'https://catalog.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
test('catalog rejects expensive or malformed parameters before any database request',async()=>{
 let requests=0;const catalog=createSupabaseCatalog(config,async()=>{requests++;return Response.json({});});
 for(const q of ['limit=101','page=10001','q='+Array(13).fill('term').join('+'),'ids='+Array(201).fill('id').join(','),'minPrice=Infinity','minDiscount=0.5','featured=1','store=other','ids=invalid/id']){
  await assert.rejects(catalog.query(new URLSearchParams(q)),e=>e.status===400);
 }
 assert.equal(requests,0);
 assert.deepEqual(parseCatalogQuery(new URLSearchParams('ids=&featured=false')).ids,[]);
});
test('local catalog supports bounded home/favorite selections and stable ordering',()=>{
 const base={name:'Fone',category:'informatica',store:'amazon',currentPrice:100,previousPrice:200,publishedAt:'2026-01-01T00:00:00Z'};
 const offers=[{...base,id:'b',featured:false,flash:true},{...base,id:'a',featured:true,flash:false}];
 assert.equal(queryOffers(offers,new URLSearchParams('q=informatica&featured=true&ids=a,b')).items[0].id,'a');
 assert.equal(queryOffers(offers,new URLSearchParams('ids=')).total,0);
 assert.deepEqual(queryOffers(offers,new URLSearchParams('sort=price-asc')).items.map(o=>o.id),['a','b']);
 assert.equal(publicOffer({...base,id:'future',status:'active',available:true,affiliateUrl:'https://example.com',image:'https://example.com/i.png',publishedAt:'2999-01-01T00:00:00Z'}),false);
});
test('browser repository performs one request per requested page and detects an HTML fallback',async t=>{
 const previous=globalThis.fetch;t.after(()=>{globalThis.fetch=previous});const calls:string[]=[];
 globalThis.fetch=async(url,options)=>{calls.push(String(url));assert.ok(options.signal);return Response.json({items:[],total:401,page:2,limit:12,totalPages:34});};
 const controller=new AbortController();const page=await offerRepository.query({page:2,limit:12,ids:['a','b'],flash:true},controller.signal);
 assert.equal(page.totalPages,34);assert.equal(calls.length,1);assert.ok(calls[0].includes('page=2'));assert.ok(calls[0].includes('ids=a%2Cb'));
 assert.equal(catalogSearchParams({maxPrice:Infinity}).has('maxPrice'),false);
 globalThis.fetch=async()=>new Response('<html>SPA</html>',{headers:{'Content-Type':'text/html'}});
 await assert.rejects(offerRepository.query(),/carregar as ofertas/);
});
test('catalog migration absence is surfaced instead of falling back to a complete database scan',async()=>{
 let requests=0;const catalog=createSupabaseCatalog(config,async()=>{requests++;return new Response('{}',{status:404});});
 await assert.rejects(catalog.query(),e=>e.status===503&&e.code==='CATALOG_QUERY_NOT_CONFIGURED');
 assert.equal(requests,1);
});
