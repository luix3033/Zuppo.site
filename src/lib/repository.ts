import type { Offer } from '../data/types';
export interface OfferQuery {
  q?: string; category?: string; store?: string; minPrice?: number; maxPrice?: number;
  minDiscount?: number; sort?: string; limit?: number; page?: number;
  ids?: string[]; featured?: boolean; flash?: boolean;
}
export interface OfferPage {items:Offer[];total:number;page:number;limit:number;totalPages:number}
export function catalogSearchParams(query:OfferQuery):URLSearchParams {
  const params=new URLSearchParams();
  for(const [key,value] of Object.entries(query)){
    if(value===undefined||value===null||(typeof value==='number'&&!Number.isFinite(value)))continue;
    params.set(key,Array.isArray(value)?value.join(','):String(value));
  }
  if(!params.has('limit'))params.set('limit','12');
  return params;
}
async function readResponse(response:Response){
  if(!response.headers.get('Content-Type')?.includes('application/json'))throw Error('Não conseguimos carregar as ofertas. Tente novamente em instantes.');
  const data=await response.json();
  if(!response.ok)throw Error(typeof data.error==='string'?data.error:'Não conseguimos consultar o catálogo. Tente novamente.');
  return data;
}
export const offerRepository = {
  async query(query:OfferQuery={},signal?:AbortSignal):Promise<OfferPage>{
    const data=await readResponse(await fetch('/api/offers?'+catalogSearchParams(query),{signal}));
    if(!data||!Array.isArray(data.items)||!Number.isSafeInteger(data.total)||data.total<0||!Number.isInteger(data.page)||data.page<1||!Number.isInteger(data.limit)||data.limit<1||data.limit>100||data.items.length>data.limit||!Number.isInteger(data.totalPages)||data.totalPages<1)throw Error('O catálogo retornou uma resposta inválida. Tente novamente.');
    return data;
  },
  async find(id:string,signal?:AbortSignal):Promise<Offer|null>{
    if(!/^[-a-zA-Z0-9_]{1,100}$/.test(id))return null;
    const response=await fetch('/api/offers/'+encodeURIComponent(id),{signal});
    if(response.status===404)return null;
    return readResponse(response);
  },
};
