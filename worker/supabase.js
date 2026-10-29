import {publicOffer, queryOffers} from './offers.js';

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
export function createSupabaseCatalog(env, fetcher = fetch) {
  const base = new URL(env.SUPABASE_URL);
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw Error('URL Supabase inválida');
  if (!env.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')) throw Error('Configure somente a chave publishable');
  async function request(params, signal) {
    const response = await fetcher(new URL('/rest/v1/offers?' + params, base), {
      headers: {apikey: env.SUPABASE_PUBLISHABLE_KEY, Accept: 'application/json'},
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000),
      cache: 'no-store',
    });
    // Não expor erro remoto, URL ou chave na resposta pública.
    if (!response.ok) throw Error('Catálogo indisponível');
    const rows = await response.json();
    if (!Array.isArray(rows)) throw Error('Resposta de catálogo inválida');
    return rows;
  }
  function params() {
    return new URLSearchParams({select, status: 'eq.active', available: 'eq.true',
      published_at: 'lte.' + new Date().toISOString(),
      or: '(expires_at.is.null,expires_at.gt.' + new Date().toISOString() + ')',
      order: 'published_at.desc,id.asc'});
  }
  async function list(filters = new URLSearchParams(), signal) {
    const q = params();
    if (filters.get('category') && filters.get('category') !== 'all') q.set('product.category_id', 'eq.' + filters.get('category'));
    if (filters.get('store') && filters.get('store') !== 'all') q.set('marketplace_id', 'eq.' + filters.get('store'));
    for (const [key, operator] of [['minPrice', 'gte'], ['maxPrice', 'lte']]) {
      if (filters.has(key)) {
        const cents = Math.round(Number(filters.get(key)) * 100);
        if (Number.isSafeInteger(cents) && cents >= 0) q.append('current_price_cents', operator + '.' + cents);
      }
    }
    // PostgREST pode limitar o tamanho de cada resposta. Continuar até a página vazia.
    // Busca textual/desconto e paginação final mantêm o contrato atual da API.
    const all = [];
    let offset = 0;
    for (;;) {
      q.set('limit', '200'); q.set('offset', String(offset));
      const rows = await request(q, signal);
      if (!rows.length) break;
      all.push(...rows.map(mapSupabaseOffer).filter(publicOffer));
      offset += rows.length;
    }
    return all;
  }
  async function find(id, signal) {
    const q = params(); q.set('id', 'eq.' + id); q.set('limit', '1');
    const rows = await request(q, signal);
    if (!rows.length) return null;
    const offer = mapSupabaseOffer(rows[0]);
    return publicOffer(offer) ? offer : null;
  }
  return {list, find, async query(filters, signal) {return queryOffers(await list(filters, signal), filters);}};
}
