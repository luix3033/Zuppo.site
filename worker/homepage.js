import {validHome} from './home-validation.js';
import {readJsonBody} from './request-security.js';

const homepageJson=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const initialHomepage=defaultHome=>({config:defaultHome,revision:'initial'});
const homepageConflict=()=>homepageJson({error:'A página mudou em outra janela. Recarregue o editor antes de publicar novamente.'},409);

/** O chamador deve validar autenticação e Origin antes das rotas administrativas. */
export async function homepageApi(request,db,defaultHome={}){
  if(!db)throw Error('Armazenamento indisponível');
  const path=new URL(request.url).pathname;
  if(path==='/api/homepage'&&request.method==='GET'){
    const published=await db.get('content/home-published');
    return homepageJson(published?await published.json():initialHomepage(defaultHome));
  }
  if(path==='/api/admin/homepage'&&request.method==='GET'){
    const [draft,published]=await Promise.all([db.get('content/home-draft'),db.get('content/home-published')]);
    return homepageJson({draft:draft?await draft.json():initialHomepage(defaultHome),published:published?await published.json():initialHomepage(defaultHome)});
  }
  if(path==='/api/admin/homepage'&&request.method==='PUT'){
    const input=await readJsonBody(request,262144);
    if(!input||!validHome(input.config))return homepageJson({error:'Confira os textos, links e seções da página inicial.'},400);
    const draft=await db.get('content/home-draft');
    const current=draft?await draft.json():initialHomepage(defaultHome);
    if(input.revision!==current.revision)return homepageConflict();
    const record={config:input.config,revision:crypto.randomUUID(),updatedAt:new Date().toISOString()};
    const result=await db.put('content/home-draft',JSON.stringify(record),{onlyIf:draft?{etagMatches:draft.etag}:{etagDoesNotMatch:'*'}});
    return result?homepageJson(record):homepageConflict();
  }
  if(path==='/api/admin/homepage/publish'&&request.method==='POST'){
    const input=await readJsonBody(request,4096);
    if(!input||typeof input.revision!=='string'||typeof input.publishedRevision!=='string'||input.revision.length>100||input.publishedRevision.length>100)return homepageConflict();
    // Capturar o estado publicado ANTES do rascunho. O CAS abaixo protege o
    // intervalo inteiro contra outra publicação, mesmo enquanto lemos o draft.
    const published=await db.get('content/home-published');
    const current=published?await published.json():initialHomepage(defaultHome);
    if(input.publishedRevision!==current.revision)return homepageConflict();
    const storedDraft=await db.get('content/home-draft');
    if(!storedDraft)return homepageJson({error:'Salve um rascunho antes de publicar.'},400);
    const draft=await storedDraft.json();
    if(input.revision!==draft.revision)return homepageConflict();
    if(!validHome(draft.config))return homepageJson({error:'Rascunho inválido.'},400);
    const result={...draft,publishedAt:new Date().toISOString()};
    const written=await db.put('content/home-published',JSON.stringify(result),{onlyIf:published?{etagMatches:published.etag}:{etagDoesNotMatch:'*'}});
    return written?homepageJson(result):homepageConflict();
  }
  return homepageJson({error:'Método ou rota indisponível.'},405);
}
