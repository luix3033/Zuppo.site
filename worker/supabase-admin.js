import {mapSupabaseOffer} from './supabase.js';
export function createSupabaseAdminCatalog(env, identity, fetcher = fetch) {
  if (!identity?.token) throw Error('Identidade administrativa obrigatória');
  const base = new URL(env.SUPABASE_URL);
  async function adminRequest(path, init = {}) {
    const response = await fetcher(new URL('/rest/v1/' + path,base),{
      ...init,headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+identity.token,'Content-Type':'application/json'},
      signal:AbortSignal.timeout(15000),cache:'no-store',
    });
    if (!response.ok) {
      const error = new Error(response.status===404?'Aplique a migração SQL 202610290002_admin_catalog no Supabase para habilitar a gravação.':response.status===401?'Sua sessão expirou. Entre novamente.':response.status===403?'A conta não tem permissão para alterar ofertas.':response.status===400||response.status===409?'Confira os dados, a categoria, a loja e a data de expiração da oferta.':'Não foi possível acessar o catálogo administrativo. Tente novamente.');
      error.status = response.status===404?503:[400,401,403,409].includes(response.status)?response.status:503;
      throw error;
    }
    return response.json();
  }
  const adminSelect = 'id,created_at,current_price_cents,previous_price_cents,affiliate_url,status,available,featured,flash,source,shipping,published_at,updated_at,expires_at,product:products!inner(name,description,category_id,image_url,specs),marketplace_id';
  async function list() {
    const all=[];let offset=0;
    for (;;) {
      const q=new URLSearchParams({select:adminSelect,order:'created_at.desc,id.asc',limit:'200',offset:String(offset)});
      const rows=await adminRequest('offers?'+q);
      if(!Array.isArray(rows))throw Error('Resposta inválida');
      if(!rows.length)return all;
      all.push(...rows.map(mapSupabaseOffer));offset+=rows.length;
    }
  }
  async function save(offer) {
    const current=Math.round(offer.currentPrice*100),previous=offer.previousPrice==null?null:Math.round(offer.previousPrice*100);
    if(!Number.isSafeInteger(current)||current<=0||(previous!==null&&!Number.isSafeInteger(previous))) {const error=new Error('Preço fora do intervalo permitido.');error.status=400;throw error;}
    const payload={id:offer.id,name:offer.name.trim(),description:offer.description.trim(),category_id:offer.category,marketplace_id:offer.store,
      image_url:offer.image||null,current_price_cents:current,previous_price_cents:previous,affiliate_url:offer.affiliateUrl||null,
      status:offer.status,available:!!offer.available,featured:!!offer.featured,flash:!!offer.flash,expires_at:offer.expiresAt||null};
    await adminRequest('rpc/zuppo_save_offer',{method:'POST',body:JSON.stringify({payload})});
    return {ok:true,id:offer.id};
  }
  async function remove(id) {return adminRequest('rpc/zuppo_delete_offer',{method:'POST',body:JSON.stringify({offer_key:id})});}
  return {list,save,remove};
}
