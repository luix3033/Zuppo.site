import {readJsonBody} from './request-security.js';
export async function mediaApi(request,db,url,offers){
 const id=url.pathname.slice('/api/admin/media/'.length);const key='media/'+id;
 if(url.pathname==='/api/admin/media'&&request.method==='GET'){
  const cursor=url.searchParams.get('cursor')||undefined;const page=await db.list({prefix:'media/',limit:48,cursor,include:['customMetadata','httpMetadata']});
  return Response.json({items:page.objects.map(o=>({id:o.key.slice(6),url:'/'+o.key,name:o.customMetadata?.name||o.key.slice(6),alt:o.customMetadata?.alt||'',size:o.size||0,type:o.httpMetadata?.contentType||'',createdAt:o.customMetadata?.uploadedAt||o.uploaded})),cursor:page.truncated?page.cursor:null},{headers:{'Cache-Control':'no-store'}});
 }
 if(!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(id))return Response.json({error:'Imagem inválida.'},{status:400});
 const file=await db.get(key);if(!file)return Response.json({error:'Imagem não encontrada.'},{status:404});
 if(request.method==='PUT'){
  const input=await readJsonBody(request,4096);if(!input||typeof input!=='object'||typeof input.name!=='string'||!input.name.trim()||input.name.length>200||typeof input.alt!=='string'||input.alt.length>500)return Response.json({error:'Informe um nome e uma descrição válidos.'},{status:400});
  await db.put(key,file.body,{httpMetadata:file.httpMetadata,customMetadata:{...file.customMetadata,name:input.name.trim(),alt:input.alt}});return Response.json({ok:true});
 }
 if(request.method==='DELETE'){
  function uses(v){if(typeof v==='string'){try{const image=new URL(v,url.origin);return image.origin===url.origin&&image.pathname==='/'+key}catch{return false}}if(Array.isArray(v))return v.some(uses);return v&&typeof v==='object'?Object.values(v).some(uses):false}
  for(const content of ['content/home-draft','content/home-published']){const stored=await db.get(content);if(stored&&uses(await stored.json()))return Response.json({error:'Esta imagem está em uso na página inicial ou no rascunho. Substitua-a antes de remover.'},{status:409})}
  if((await offers()).some(uses))return Response.json({error:'Esta imagem está em uso em uma oferta. Substitua-a antes de remover.'},{status:409});
  await db.delete(key);return Response.json({ok:true});
 }
 return Response.json({error:'Método não permitido.'},{status:405});
}
