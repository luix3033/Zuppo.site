import {AdminAuthError,getSupabaseAdmin,handleAdminAuth} from './admin-auth.js';
import {createSupabaseAdminCatalog} from './supabase-admin.js';
import {createSupabaseCatalog,supabaseEnabled} from './supabase.js';
import {readOffers,publicOffer,queryOffers,validateOffer} from './offers.js';
import {readSettings,validSettings} from './settings.js';
import {mediaApi} from './media.js';
import {validHome} from './home-validation.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function createHandler(assets,_seed=[],defaultHome={}){return {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 const legacyAdmin=!!env.ADMIN_EMAIL && request.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.ADMIN_EMAIL.toLowerCase();
 const db=env.BUCKET;
 try{
 const external=supabaseEnabled(env)?createSupabaseCatalog(env):null;
 if(external&&path.startsWith('/api/auth/'))return await handleAdminAuth(request,env);
 const identity=external&&path.startsWith('/api/admin/')?await getSupabaseAdmin(request,env):null;
 const admin=external?!!identity:legacyAdmin;
 const adminCatalog=identity?createSupabaseAdminCatalog(env,identity):null;
 async function visibleOffer(id){return external?external.find(id,request.signal):(await offers()).find(o=>o.id===id&&publicOffer(o));}
 if(path==='/api/admin/session')return json({authenticated:admin,authProvider:external?'supabase':'chatgpt',...(admin?{catalogReadOnly:false,catalogProvider:external?'supabase':'r2'}:{})},admin?200:401);
 if(path.startsWith('/api/admin/')&&!admin)return json({error:external?'Entre com sua conta administrativa.':'Acesso restrito ao administrador.'},external?401:403);
 if(path.startsWith('/api/')&&request.method!=='GET'&&request.headers.get('Origin')!==url.origin)return json({error:'Origem inválida.'},403);
 async function offers(){if(!db)throw Error('Armazenamento indisponível');return readOffers(db)}
 if(path==='/api/settings'&&request.method==='GET')return json(await readSettings(db));
 if(path==='/api/admin/settings'){if(request.method==='GET')return json(await readSettings(db));if(request.method==='PUT'){const input=await request.json();if(!validSettings(input))return json({error:'Confira o e-mail e os links HTTPS dos canais oficiais.'},400);const safe={contactEmail:input.contactEmail.trim(),whatsappUrl:input.whatsappUrl,telegramUrl:input.telegramUrl,instagramUrl:input.instagramUrl};await db.put('settings/site',JSON.stringify(safe));return json(safe)}}


 if(path==='/api/homepage') {const o=await db.get('content/home-published');const record=o?await o.json():{config:defaultHome,revision:'initial'};if(record.config?.flash?.description==='Conheça a seleção relâmpago. As ofertas desta versão são demonstrativas.')record.config.flash.description=defaultHome.flash.description;return json(record);}
 if(path==='/api/admin/homepage') {
  const draft=await db.get('content/home-draft');const published=await db.get('content/home-published');
  if(request.method==='GET')return json({draft:draft?await draft.json():{config:defaultHome,revision:'initial'},published:published?await published.json():{config:defaultHome,revision:'initial'}});
  if(request.method==='PUT'){
   const input=await request.json();if(!validHome(input.config))return json({error:'Confira os textos, links e seções da página inicial.'},400);
   const current=draft?await draft.json():{revision:'initial'};if(input.revision!==current.revision)return json({error:'O rascunho mudou em outra janela. Recarregue antes de salvar.'},409);
   const record={config:input.config,revision:crypto.randomUUID(),updatedAt:new Date().toISOString()};
   const result=await db.put('content/home-draft',JSON.stringify(record),{onlyIf:draft?{etagMatches:draft.etag}:{etagDoesNotMatch:'*'}});if(!result)return json({error:'O rascunho mudou. Recarregue e tente novamente.'},409);return json(record);
  }
 }
 if(path==='/api/admin/homepage/publish'&&request.method==='POST') {
  const input=await request.json();const d=await db.get('content/home-draft');if(!d)return json({error:'Salve um rascunho antes de publicar.'},400);const draft=await d.json();if(input.revision!==draft.revision)return json({error:'O rascunho foi atualizado. Recarregue antes de publicar.'},409);
  if(!validHome(draft.config))return json({error:'Rascunho inválido.'},400);
  const result={...draft,publishedAt:new Date().toISOString()};await db.put('content/home-published',JSON.stringify(result));return json(result);
 }
 if((path==='/api/admin/media'&&request.method==='GET')||path.startsWith('/api/admin/media/'))return await mediaApi(request,db,url,async()=> adminCatalog?await adminCatalog.list():(await offers()).filter(o=>!o.isDemo));
 if(path==='/api/admin/media'&&request.method==='POST') {
  if(Number(request.headers.get('content-length'))>5*1024*1024)return json({error:'Imagem muito grande (máximo 4 MB).'},413);
  const form=await request.formData();const file=form.get('file');if(!(file instanceof File)||file.size>4*1024*1024)return json({error:'Selecione uma imagem de até 4 MB.'},400);
  const bytes=new Uint8Array(await file.arrayBuffer());const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;const webp=new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
  if(!png&&!jpg&&!webp)return json({error:'Use uma imagem PNG, JPEG ou WebP.'},400);
  const key='media/'+crypto.randomUUID()+'.'+(png?'png':jpg?'jpg':'webp');await db.put(key,bytes,{httpMetadata:{contentType:png?'image/png':jpg?'image/jpeg':'image/webp'},customMetadata:{name:file.name.slice(0,200),alt:'',uploadedAt:new Date().toISOString()}});return json({url:'/'+key});
 }
 if(path.startsWith('/media/')){const file=await db.get(path.slice(1));if(!file)return new Response('Imagem não encontrada',{status:404});return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'public,max-age=31536000,immutable'}});}
 if(path.startsWith('/go/')&&request.method==='GET'){
 const id=decodeURIComponent(path.slice(4));const offer=await visibleOffer(id);if(!offer)return new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Oferta indisponível — Zuppo</title><body style="font-family:Arial;padding:10vh 10vw;background:#f6f6f8;color:#16161a"><h1>Essa oferta não está mais disponível.</h1><p>Confira os outros achados da Zuppo.</p><a href="/ofertas">Voltar às ofertas</a></body></html>',{status:410,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
 try{await db.put('events/'+new Date().toISOString()+'/'+crypto.randomUUID(),JSON.stringify({type:'click',productId:offer.id,at:new Date().toISOString(),verified:true}))}catch{}
 return new Response(null,{status:302,headers:{Location:offer.affiliateUrl,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }
 if(path==='/api/offers' &&request.method==='GET'){if(external)return json(url.search?await external.query(url.searchParams,request.signal):await external.list(undefined,request.signal));const visible=(await offers()).filter(publicOffer);return json(url.search?queryOffers(visible,url.searchParams):visible);}
 if(path==='/api/admin/offers'&&request.method==='GET')return json(adminCatalog?await adminCatalog.list():(await offers()).filter(o=>!o.isDemo));
 if(path.startsWith('/api/offers/')&&request.method==='GET'){const id=decodeURIComponent(path.split('/').pop());const o=await visibleOffer(id);return o?json(o):json({error:'Oferta indisponível.'},404);}
 if(path==='/api/events'&&request.method==='POST'){
 const e=await request.json();if(e.type!=='view'||typeof e.productId!=='string'||e.productId.length>150)return json({error:'Evento inválido'},400);
 if(!await visibleOffer(e.productId))return json({error:'Produto inexistente'},404);
 await db.put('events/'+new Date().toISOString()+'/'+crypto.randomUUID(),JSON.stringify({type:e.type,productId:e.productId,at:new Date().toISOString(),verified:true}));return json({ok:true});
 }
 if(path==='/api/admin/stats'){
 if(!db)throw Error('Armazenamento indisponível');const start=new Date(Date.now()-30*86400000).toISOString();const list=await db.list({prefix:'events/',startAfter:'events/'+start,limit:1000});const events=await Promise.all(list.objects.map(async o=>(await db.get(o.key)).json()));const real=adminCatalog?await adminCatalog.list():(await offers()).filter(o=>!o.isDemo);const eligible=new Set(real.map(o=>o.id));const tracked=events.filter(e=>e.verified===true||eligible.has(e.productId));const counts={};for(const e of tracked){counts[e.productId]??={views:0,clicks:0};counts[e.productId][e.type==='view'?'views':'clicks']++}return json({events:tracked.length,totalOffers:real.length,publicOffers:real.filter(publicOffer).length,drafts:real.filter(o=>o.status==='draft').length,views:tracked.filter(e=>e.type==='view').length,clicks:tracked.filter(e=>e.type==='click').length,products:counts,limited:list.truncated});
 }
 if(path.startsWith('/api/admin/offers/')&&['PUT','DELETE'].includes(request.method)){
 const id=decodeURIComponent(path.split('/').pop());if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))return json({error:'ID inválido'},400);
 if(request.method==='DELETE'){if(adminCatalog)return json(await adminCatalog.remove(id));await db.put('offers/'+id,JSON.stringify({id,deleted:true}));return json({ok:true})}
 const o=await request.json();const validation=validateOffer(o,id);if(validation)return json({error:validation},400);
 if(adminCatalog)return json(await adminCatalog.save(o));
 const before=await db.get('offers/'+id);const stored=before?await before.json():null;const previous=stored&&!stored.isDemo&&!stored.deleted?stored:null;const now=new Date().toISOString();
 const safe={id,name:o.name.trim(),description:o.description.trim(),category:o.category,store:o.store,image:o.image||'',affiliateUrl:o.affiliateUrl||null,currentPrice:o.currentPrice,...(o.previousPrice?{previousPrice:o.previousPrice}:{}),publishedAt:previous?.publishedAt||now,updatedAt:now,available:!!o.available,status:o.status,isDemo:false,featured:!!o.featured,flash:!!o.flash,source:'Cadastro administrativo',expiresAt:o.expiresAt||null,...(previous?.specs?{specs:previous.specs}:{}),history:[...(previous?.history||[]),...(!previous||previous.currentPrice!==o.currentPrice?[{date:now,price:o.currentPrice,note:'Preço informado na administração'}]:[])].slice(-100)};
 await db.put('offers/'+id,JSON.stringify(safe));return json(safe);
 }
 if(path.startsWith('/api/'))return json({error:'Rota não encontrada'},404);
 const file=assets[path]||assets['/index.html'];const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));return new Response(bytes,{headers:{'Content-Type':file.type,'Cache-Control':path.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache',...(path.startsWith('/zuppo-admin')?{'X-Robots-Tag':'noindex,nofollow'}:{}),'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
 }catch(error){if(error instanceof AdminAuthError||[400,401,403,409,503].includes(error.status))return json({error:error.message},error.status);if(error instanceof SyntaxError)return json({error:'O corpo da solicitação deve ser um JSON válido.'},400);return json({error:'Não foi possível concluir. Tente novamente.'},503)}
}}}
