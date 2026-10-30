import {createHandler} from '../worker/index.js';
import {defaultHome} from '../src/features/homepage/config.ts';
import {VercelBucket} from '../server/vercel-bucket.mjs';
import {waitUntil} from '@vercel/functions';
const handler=createHandler({},[],defaultHome);
const bucket=new VercelBucket();
export default {
 async fetch(request){
  const url=new URL(request.url),route=url.searchParams.get('__zuppo_path')||url.pathname.slice(1);
  if(!/^(api\/|go\/|media\/|healthz$)/.test(route)||route.split('/').some(segment=>{try{return /[\\/?#]/.test(decodeURIComponent(segment))||['.','..'].includes(decodeURIComponent(segment));}catch{return true;}}))return Response.json({error:'Rota inválida.'},{status:404});
  url.pathname='/'+route;url.searchParams.delete('__zuppo_path');url.searchParams.delete('path');
  const headers=new Headers(request.headers);
  for(const name of ['cf-connecting-ip','x-zuppo-proxy-secret','x-zuppo-client-ip','x-zuppo-dev-email'])headers.delete(name);
  const client=headers.get('x-vercel-forwarded-for')?.split(',')[0].trim();
  if(client&&/^[a-f0-9:.]{1,64}$/i.test(client))headers.set('cf-connecting-ip',client);
  const input=new Request(url,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,duplex:'half'});
  const env={CATALOG_PROVIDER:process.env.CATALOG_PROVIDER||'supabase',SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY,BUCKET:bucket,ASSETS:{fetch:async()=>new Response('Not found',{status:404})}};
  return handler.fetch(input,env,{waitUntil});
 }
};
