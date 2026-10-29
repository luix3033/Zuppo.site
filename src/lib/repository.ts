import type { Offer } from '../data/types';

/** Swap this adapter for an authorized HTTP API without changing the UI. */
export interface OfferRepository { list(signal?: AbortSignal): Promise<Offer[]> }
export const offerRepository: OfferRepository = {
  async list(signal) {
    if (signal?.aborted) throw new DOMException('Solicitação cancelada', 'AbortError');
    const response = await fetch('/api/offers?limit=100', { signal });
    if (!response.ok) throw new Error('Falha ao consultar o catálogo');
    const first = await response.json();
    if (Array.isArray(first)) return first;
    const all: Offer[] = [...first.items];
    for (let page = 2; page <= first.totalPages; page++) {
      const next = await fetch('/api/offers?page=' + page + '&limit=100', {signal});
      if (!next.ok) throw new Error('Falha ao carregar o catálogo');
      all.push(...(await next.json()).items);
    }
    return all;
  },
};
