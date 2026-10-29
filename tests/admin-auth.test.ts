import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getSupabaseAdmin,handleAdminAuth} from '../worker/admin-auth.js';
import {createHandler} from '../worker/index.js';
const env={CATALOG_PROVIDER:'supabase',SUPABASE_URL:'https://catalog.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
const uid='f0000000-0000-4000-8000-000000000001';
function request(path,body?,headers={}){return new Request('https://site.test'+path,{method:body?'POST':'GET',headers:{Origin:'https://site.test','Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});}
function authMock(options:{member?:boolean;expired?:boolean;badLogin?:boolean;throttle?:boolean}={}){
 return async(url,init)=>{
  const u=new URL(url);
  if(u.pathname==='/auth/v1/token')return options.badLogin||options.throttle?Response.json({secret:'remote details'},{status:options.throttle?429:400}):Response.json({access_token:'valid-access',refresh_token:'valid-refresh',expires_in:3600});
  if(u.pathname==='/auth/v1/user')return options.expired?Response.json({},{status:401}):Response.json({id:uid,email:'admin@example.com'});
  if(u.pathname==='/rest/v1/admin_memberships')return Response.json(options.member===false?[]:[{user_id:uid}]);
  if(u.pathname==='/auth/v1/logout')return new Response(null,{status:204});
  throw Error('Unexpected route '+u.pathname);
 };
}
test('password login verifies membership and sets protected cookies without exposing tokens',async()=>{
 const r=await handleAdminAuth(request('/api/auth/login',{email:'admin@example.com',password:'private-password'}),env,authMock());
 assert.equal(r.status,200);const data=await r.json();assert.equal(data.authenticated,true);assert.equal(data.access_token,undefined);assert.equal(data.refresh_token,undefined);
 const cookies=r.headers.getSetCookie();assert.equal(cookies.length,2);
 for(const c of cookies){assert.match(c,/HttpOnly/);assert.match(c,/Secure/);assert.match(c,/Partitioned/);assert.match(c,/Path=\//);assert.doesNotMatch(c,/Domain=/);}
 assert.equal(r.headers.get('cache-control'),'no-store');
});
test('login rejects wrong passwords, common users, throttling and foreign origins',async()=>{
 const req=()=>request('/api/auth/login',{email:'admin@example.com',password:'wrong'});
 assert.equal((await handleAdminAuth(req(),env,authMock({badLogin:true}))).status,401);
 assert.equal((await handleAdminAuth(req(),env,authMock({throttle:true}))).status,429);
 await assert.rejects(handleAdminAuth(req(),env,authMock({member:false})),e=>e.status===403);
 const blocked=await handleAdminAuth(request('/api/auth/login',{email:'admin@example.com',password:'x'},{Origin:'https://evil.test'}),env,()=>{throw Error('Must not fetch')});assert.equal(blocked.status,403);
});
test('membership is rechecked, expired tokens fail, refresh rotates cookies and logout clears them',async()=>{
 const req=request('/api/admin/offers',undefined,{Cookie:'__Host-zuppo-access=valid-access'});
 assert.equal((await getSupabaseAdmin(req,env,authMock())).userId,uid);
 await assert.rejects(getSupabaseAdmin(req,env,authMock({member:false})),e=>e.status===403);
 await assert.rejects(getSupabaseAdmin(req,env,authMock({expired:true})),e=>e.status===401);
 const refresh=await handleAdminAuth(request('/api/auth/refresh',{}, {Cookie:'__Host-zuppo-refresh=valid-refresh'}),env,authMock());assert.equal(refresh.status,200);assert.equal(refresh.headers.getSetCookie().length,2);
 const logout=await handleAdminAuth(request('/api/auth/logout',{}, {Cookie:'__Host-zuppo-access=valid-access'}),env,authMock());assert.equal(logout.status,200);assert.ok(logout.headers.getSetCookie().every(c=>c.includes('Max-Age=0')));
});
test('all SQL admin routes require Supabase identity; writes forward its JWT and cannot touch R2 catalog',async t=>{
 const previous=globalThis.fetch;t.after(()=>{globalThis.fetch=previous});const auth=authMock();const mutations:any[]=[];const bucketWrites:any[]=[];
 const row={id:'real-offer',current_price_cents:10000,status:'draft',available:true,product:{name:'Produto',description:'Descrição',category_id:'games',image_url:'',specs:{}},marketplace_id:'amazon',published_at:null,updated_at:'2026-10-01T00:00:00Z'};
 globalThis.fetch=async(url,init)=>{
  const u=new URL(url);
  if(u.pathname.startsWith('/rest/v1/rpc/')){mutations.push({path:u.pathname,body:JSON.parse(init.body),headers:init.headers});return Response.json({ok:true});}
  if(u.pathname==='/rest/v1/offers')return Response.json(u.searchParams.get('offset')==='0'?[row]:[]);
  return auth(url,init);
 };
 const handler=createHandler({});const runtime={...env,ADMIN_EMAIL:'legacy@example.com',BUCKET:{put:async(...args)=>bucketWrites.push(args),list:async()=>({objects:[]})}};
 const call=(path,method='GET',body?,cookie=true,origin='https://site.test')=>handler.fetch(new Request('https://site.test'+path,{method,headers:{Origin:origin,'Content-Type':'application/json','oai-authenticated-user-email':'legacy@example.com',...(cookie?{Cookie:'__Host-zuppo-access=valid-access'}:{})},...(body?{body:JSON.stringify(body)}:{})}),runtime);
 assert.equal((await call('/api/admin/offers','GET',undefined,false)).status,401);
 const rows=await(await call('/api/admin/offers')).json();assert.equal(rows[0].status,'draft');assert.equal(rows[0].publishedAt,row.updated_at);
 const offer={id:'real-offer',name:'Produto real',description:'Descrição real',category:'games',store:'amazon',image:'https://example.com/p.webp',currentPrice:129.99,previousPrice:199.9,affiliateUrl:'https://example.com/buy',status:'active',available:true};
 assert.equal((await call('/api/admin/offers/real-offer','PUT',offer,true,'https://evil.test')).status,403);assert.equal(mutations.length,0);
 assert.equal((await call('/api/admin/offers/real-offer','PUT',offer)).status,200);
 assert.equal(mutations[0].headers.Authorization,'Bearer valid-access');assert.equal(mutations[0].body.payload.current_price_cents,12999);
 assert.equal((await call('/api/admin/offers/real-offer','DELETE')).status,200);assert.equal(mutations[1].path,'/rest/v1/rpc/zuppo_delete_offer');assert.equal(bucketWrites.length,0);
 assert.equal((await call('/api/admin/offers/real-offer','PUT',{...offer,affiliateUrl:'javascript:bad'})).status,400);
 globalThis.fetch=async()=>Response.json({},{status:401});assert.equal((await call('/api/admin/settings','PUT',{})).status,401);
});
