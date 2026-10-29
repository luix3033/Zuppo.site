import {validateOffer} from './offers.js';
import {readJsonBody} from './request-security.js';
import {json} from './http.js';
/** Repositório SQL em produção; escrita R2 mantida apenas no ambiente local. */
export async function writeAdminOffer(request,db,catalog,id){
  if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))return json({error:'ID inválido.'},400);
  if(request.method==='DELETE'){
    if(catalog)return json(await catalog.remove(id));
    await db.put('offers/'+id,JSON.stringify({id,deleted:true}));return json({ok:true});
  }
  const o=await readJsonBody(request,32*1024);
  const validation=validateOffer(o,id);if(validation)return json({error:validation},400);
  if(catalog)return json(await catalog.save(o));
  const before=await db.get('offers/'+id),stored=before?await before.json():null;
  const previous=stored&&!stored.isDemo&&!stored.deleted?stored:null,now=new Date().toISOString();
  const safe={id,name:o.name.trim(),description:o.description.trim(),category:o.category,store:o.store,image:o.image||'',affiliateUrl:o.affiliateUrl||null,currentPrice:o.currentPrice,...(o.previousPrice?{previousPrice:o.previousPrice}:{}),publishedAt:previous?.publishedAt||now,updatedAt:now,available:!!o.available,status:o.status,isDemo:false,featured:!!o.featured,flash:!!o.flash,source:'Cadastro administrativo',expiresAt:o.expiresAt||null,...(previous?.specs?{specs:previous.specs}:{}),history:[...(previous?.history||[]),...(!previous||previous.currentPrice!==o.currentPrice?[{date:now,price:o.currentPrice,note:'Preço informado na administração'}]:[])].slice(-100)};
  await db.put('offers/'+id,JSON.stringify(safe));return json(safe);
}
