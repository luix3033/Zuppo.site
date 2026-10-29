import {getSupabaseAdmin,handleAdminAuth} from './admin-auth.js';
import {createSupabaseAdminCatalog} from './supabase-admin.js';
import {createSupabaseCatalog,supabaseEnabled} from './supabase.js';
import {readOffers,publicOffer,queryOffers} from './offers.js';
import {readSettings,validSettings} from './settings.js';
import {mediaApi} from './media.js';
import {homepageApi} from './homepage.js';
import {writeAdminOffer} from './admin-offers.js';
import {recordEvent,readStats} from './tracking.js';
import {readJsonBody,readMultipartBody,enforceRateLimit} from './request-security.js';
import {validateImage} from './image-validation.js';
import {json,secureResponse,publicFailure} from './http.js';

function unavailableOffer(){
  return new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Oferta indisponível — Zuppo</title><body><h1>Essa oferta não está mais disponível.</h1><p>Confira os outros achados da Zuppo.</p><a href="/ofertas">Voltar às ofertas</a></body></html>',{status:410,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
async function serveAsset(request,env,assets){
  const path=new URL(request.url).pathname;
  if(!['GET','HEAD'].includes(request.method))return json({error:'Método não permitido.'},405);
  if(/^\/(server|worker|supabase|scripts)(\/|$)/.test(path)||path.startsWith('/.'))return new Response('Não encontrado',{status:404});
  if(env.ASSETS?.fetch)return env.ASSETS.fetch(request);
  // Fixtures de teste e servidor local usam o mesmo contrato; produção exige ASSETS.
  const file=assets[path]||assets['/index.html'];
  if(!file)return new Response('Assets não configurados',{status:503});
  const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));
  return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':file.type,'Cache-Control':path.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'}});
}
export function createHandler(assets={},_seed=[],defaultHome={}){
  async function dispatch(request,env,ctx){
    const url=new URL(request.url),path=url.pathname,db=env.BUCKET;
    if(path==='/healthz'&&request.method==='GET'){
      const ready=env.CATALOG_PROVIDER==='supabase'&&!!env.SUPABASE_URL&&!!env.SUPABASE_PUBLISHABLE_KEY&&!!db&&!!env.ASSETS;
      return json({status:ready?'ok':'configuration_required'},ready?200:503);
    }
    if(!path.startsWith('/api/')&&!path.startsWith('/go/')&&!path.startsWith('/media/'))return serveAsset(request,env,assets);
    const external=supabaseEnabled(env)?createSupabaseCatalog(env):null;
    if(path.startsWith('/api/')&&!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin)return json({error:'Origem inválida.'},403);
    if(external&&path.startsWith('/api/auth/'))return handleAdminAuth(request,env);
    const identity=external&&path.startsWith('/api/admin/')?await getSupabaseAdmin(request,env):null;
    const developmentAdmin=env.DEV_AUTH_ENABLED===true&&!!env.DEV_ADMIN_EMAIL&&request.headers.get('x-zuppo-dev-email')?.toLowerCase()===env.DEV_ADMIN_EMAIL.toLowerCase();
    const admin=external?!!identity:developmentAdmin;
    const adminCatalog=identity?createSupabaseAdminCatalog(env,identity):null;
    if(path==='/api/admin/session')return json({authenticated:admin,authProvider:external?'supabase':'development',...(admin?{catalogReadOnly:false,catalogProvider:external?'supabase':'r2'}:{})},admin?200:401);
    if(path.startsWith('/api/admin/')&&!admin)return json({error:external?'Entre com sua conta administrativa.':'Acesso restrito ao administrador.'},external?401:403);
    async function offers(){if(!db)throw Error('Armazenamento indisponível');return readOffers(db);}
    async function visibleOffer(id){return external?external.find(id,request.signal):(await offers()).find(o=>o.id===id&&publicOffer(o));}
    async function adminOffers(){return adminCatalog?adminCatalog.list():(await offers()).filter(o=>!o.isDemo);}

    if(path==='/api/settings'&&request.method==='GET')return json(await readSettings(db));
    if(path==='/api/admin/settings'){
      if(request.method==='GET')return json(await readSettings(db));
      if(request.method==='PUT'){
        const input=await readJsonBody(request,16*1024);
        if(!validSettings(input))return json({error:'Confira o e-mail e os links HTTPS dos canais oficiais.'},400);
        const safe={contactEmail:input.contactEmail.trim(),whatsappUrl:input.whatsappUrl,telegramUrl:input.telegramUrl,instagramUrl:input.instagramUrl};
        await db.put('settings/site',JSON.stringify(safe));return json(safe);
      }
      return json({error:'Método não permitido.'},405);
    }
    if(['/api/homepage','/api/admin/homepage','/api/admin/homepage/publish'].includes(path))return homepageApi(request,db,defaultHome);
    if((path==='/api/admin/media'&&request.method==='GET')||path.startsWith('/api/admin/media/'))return mediaApi(request,db,url,adminOffers);
    if(path==='/api/admin/media'&&request.method==='POST'){
      await enforceRateLimit(request,env,{binding:'ADMIN_RATE_LIMITER',keyPrefix:'upload',limit:60,windowMs:60000});
      const form=await readMultipartBody(request,5*1024*1024),file=form.get('file');
      if(!(file instanceof File)||file.size>4*1024*1024)return json({error:'Selecione uma imagem de até 4 MB.'},400);
      const bytes=new Uint8Array(await file.arrayBuffer()),image=validateImage(bytes);
      const key='media/'+crypto.randomUUID()+'.'+image.extension;
      await db.put(key,bytes,{httpMetadata:{contentType:image.contentType},customMetadata:{name:file.name.slice(0,200),alt:'',uploadedAt:new Date().toISOString(),width:String(image.width),height:String(image.height)}});
      return json({url:'/'+key});
    }
    if(path.startsWith('/media/')&&['GET','HEAD'].includes(request.method)){
      if(!/^\/media\/[a-f0-9-]+\.(png|jpg|webp)$/.test(path))return new Response('Imagem não encontrada',{status:404});
      const file=await db.get(path.slice(1));if(!file)return new Response('Imagem não encontrada',{status:404});
      return new Response(request.method==='HEAD'?null:file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'public,max-age=31536000,immutable'}});
    }
    if(path.startsWith('/go/')&&request.method==='GET'){
      await enforceRateLimit(request,env,{binding:'CATALOG_RATE_LIMITER',keyPrefix:'redirect-check',limit:120,windowMs:60000});
      const id=decodeURIComponent(path.slice(4));if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return unavailableOffer();
      const offer=await visibleOffer(id);if(!offer)return unavailableOffer();
      const tracking=recordEvent(request,env,'click',offer.id).catch(()=>false);
      if(ctx?.waitUntil)ctx.waitUntil(tracking);else await tracking;
      return new Response(null,{status:302,headers:{Location:offer.affiliateUrl,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
    }
    if(path==='/api/offers'&&request.method==='GET'){
      await enforceRateLimit(request,env,{binding:'CATALOG_RATE_LIMITER',keyPrefix:'catalog',limit:120,windowMs:60000});
      if(external)return json(url.search?await external.query(url.searchParams,request.signal):await external.list(undefined,request.signal));
      const visible=(await offers()).filter(publicOffer);return json(url.search?queryOffers(visible,url.searchParams):visible);
    }
    if(path==='/api/admin/offers'&&request.method==='GET')return json(await adminOffers());
    if(path.startsWith('/api/offers/')&&request.method==='GET'){
      await enforceRateLimit(request,env,{binding:'CATALOG_RATE_LIMITER',keyPrefix:'catalog-detail',limit:120,windowMs:60000});
      const id=decodeURIComponent(path.split('/').pop());
      if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return json({error:'Oferta indisponível.'},404);
      const offer=await visibleOffer(id);return offer?json(offer):json({error:'Oferta indisponível.'},404);
    }
    if(path==='/api/events'&&request.method==='POST'){
      const e=await readJsonBody(request,2048);
      if(e?.type!=='view'||typeof e.productId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(e.productId))return json({error:'Evento inválido.'},400);
      await enforceRateLimit(request,env,{binding:'EVENT_RATE_LIMITER',keyPrefix:'events-check',limit:60,windowMs:60000});
      if(!await visibleOffer(e.productId))return json({error:'Produto inexistente.'},404);
      const recorded=await recordEvent(request,env,'view',e.productId);return json({ok:true,recorded},recorded?200:202);
    }
    if(path==='/api/admin/stats'){
      if(request.method!=='GET')return json({error:'Método não permitido.'},405);
      const real=await adminOffers(),stats=await readStats(db,real);
      return json({...stats,publicOffers:real.filter(publicOffer).length,drafts:real.filter(o=>o.status==='draft').length});
    }
    if(path.startsWith('/api/admin/offers/')&&['PUT','DELETE'].includes(request.method))return writeAdminOffer(request,db,adminCatalog,decodeURIComponent(path.split('/').pop()));
    return json({error:'Rota não encontrada.'},404);
  }
  return {async fetch(request,env,ctx){
    try{return secureResponse(await dispatch(request,env,ctx),request);}
    catch(error){return secureResponse(publicFailure(error),request);}
  }};
}
