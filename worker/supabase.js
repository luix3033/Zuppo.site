import {catalogConfiguration} from './catalog-config.js';
import {publicOffer} from './offers.js';

// API HTTP oficial do Supabase: compatível com Node e Cloudflare Workers.
// Apenas chave publishable; nunca encaminhar identidade de administrador.
export function supabaseEnabled(env) {
  if (env.CATALOG_PROVIDER && !['r2', 'supabase'].includes(env.CATALOG_PROVIDER)) throw Error('Provedor inválido');
  return env.CATALOG_PROVIDER === 'supabase';
}
const select = 'id,current_price_cents,previous_price_cents,affiliate_url,status,available,featured,flash,source,shipping,published_at,updated_at,expires_at,product:products!inner(name,description,category_id,image_url,specs),marketplace_id';
export function mapSupabaseOffer(row) {
  const p = row.product;
  if (!p || Array.isArray(p)) throw Error('Produto inválido');
  const cents = Number(row.current_price_cents);
  if (!Number.isSafeInteger(cents) || cents <= 0) throw Error('Preço inválido');
  const previous = row.previous_price_cents == null ? null : Number(row.previous_price_cents);
  if (previous !== null && (!Number.isSafeInteger(previous) || previous < cents)) throw Error('Preço anterior inválido');
  return {
    id: row.id, name: p.name, description: p.description, category: p.category_id,
    store: row.marketplace_id, image: p.image_url || '', currentPrice: cents / 100,
    ...(previous === null ? {} : {previousPrice: previous / 100}),
    affiliateUrl: row.affiliate_url, status: row.status, available: row.available,
    featured: row.featured, flash: row.flash, source: row.source, shipping: row.shipping || undefined,
    publishedAt: row.published_at || row.created_at || row.updated_at, updatedAt: row.updated_at, expiresAt: row.expires_at,
    specs: p.specs, isDemo: false,
  };
}
/** Validação compartilhada antes de enviar filtros tipados ao PostgreSQL. */
export function parseCatalogQuery(params = new URLSearchParams()) {
  const bad = message => { const error = new Error(message); error.status = 400; throw error; };
  const text = (key, max=100) => { const value=(params.get(key)||'').trim(); if(value.length>max)bad('Filtro muito longo.'); return value; };
  const number = (key, fallback, max, integer=false) => {
    if(!params.has(key))return fallback;
    const raw=params.get(key); const value=Number(raw);
    if(raw===''||!Number.isFinite(value)||value<0||value>max||(integer&&!Number.isInteger(value)))bad('Confira os limites dos filtros.');
    return value;
  };
  const query={q:text('q',200),category:text('category'),store:text('store'),sort:text('sort')||'recent',
    minPrice:number('minPrice',0,90071992547409.9),maxPrice:number('maxPrice',undefined,90071992547409.9),
    minDiscount:number('minDiscount',0,100,true),page:number('page',1,10000,true),limit:number('limit',24,100,true)};
  if(query.q.trim().split(/\s+/).filter(Boolean).length>12)bad('Busca muito extensa.');
  if(!['recent','price-asc','price-desc','discount'].includes(query.sort)||query.page<1||query.limit<1)bad('Ordenação ou página inválida.');
  if(!['','all','games','informatica','celulares','casa','eletrodomesticos','esporte','beleza','bebes','pets','moda','ferramentas','carros','limpeza','roupa-infantil','brinquedos','datas-comemorativas'].includes(query.category)||!['','all','amazon','mercado-livre','shopee'].includes(query.store))bad('Categoria ou loja inválida.');
  if(params.has('ids')) {
    const ids=params.get('ids')?params.get('ids').split(','):[];
    if(ids.length>200||ids.some(id=>!/^[-a-zA-Z0-9_]{1,100}$/.test(id)))bad('Lista de ofertas inválida.');
    query.ids=[...new Set(ids)];
  }
  for(const key of ['featured','flash'])if(params.has(key)){
    if(!['true','false'].includes(params.get(key)))bad('Filtro inválido.');
    query[key]=params.get(key)==='true';
  }
  return query;
}
export function createSupabaseCatalog(env, fetcher = fetch) {
  const missing=catalogConfiguration({...env,CATALOG_PROVIDER:'supabase'});
  if(missing.length){const error=new Error('Configure no runtime do Worker: '+missing.join(', ')+'. As variáveis VITE_* do build não substituem essas configurações.');error.status=503;throw error;}
  const base = new URL(env.SUPABASE_URL);
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw Error('URL Supabase inválida');
  if (!env.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')) throw Error('Configure somente a chave publishable');
  async function request(path, signal, body) {
    const response = await fetcher(new URL('/rest/v1/'+path, base), {
      method:body===undefined?'GET':'POST',
      headers: {apikey: env.SUPABASE_PUBLISHABLE_KEY, Accept: 'application/json',...(body===undefined?{}:{'Content-Type':'application/json'})},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000),cache:'no-store',
    });
    if (!response.ok) {
      const error=new Error('O catálogo está temporariamente indisponível. Tente novamente em instantes.');
      error.status=503;error.code=response.status===404?'CATALOG_QUERY_NOT_CONFIGURED':'CATALOG_UNAVAILABLE';throw error;
    }
    return response.json();
  }
  async function query(params = new URLSearchParams(), signal) {
    const filters=parseCatalogQuery(params);
    const data=await request('rpc/zuppo_query_offers',signal,{filters});
    if(!data||!Array.isArray(data.items)||!Number.isSafeInteger(data.total)||data.total<0||!Number.isInteger(data.page)||data.page<1||!Number.isInteger(data.limit)||data.limit<1||data.limit>100||data.items.length>data.limit||!Number.isInteger(data.totalPages)||data.totalPages<1)throw Error('Resposta de catálogo inválida');
    return {...data,items:data.items.map(mapSupabaseOffer).filter(publicOffer)};
  }
  async function list(params = new URLSearchParams('limit=100'), signal) {return (await query(params,signal)).items;}
  async function find(id, signal) {
    if(!/^[-a-zA-Z0-9_]{1,100}$/.test(id))return null;
    const now=new Date().toISOString();
    const params=new URLSearchParams({select,id:'eq.'+id,limit:'1',status:'eq.active',available:'eq.true',published_at:'lte.'+now,or:'(expires_at.is.null,expires_at.gt.'+now+')'});
    const rows=await request('offers?'+params,signal);
    if(!Array.isArray(rows))throw Error('Resposta de catálogo inválida');
    if(!rows.length)return null;
    const offer=mapSupabaseOffer(rows[0]);return publicOffer(offer)?offer:null;
  }
  return {list,find,query};
}
