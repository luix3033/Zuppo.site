import { categories } from '../data/catalog';
import type { CategoryId, Offer, StoreId } from '../data/types';

export type OfferSort = 'recent' | 'price-asc' | 'price-desc' | 'discount';

export interface OfferFilters {
  query: string;
  category: CategoryId | 'all';
  store: StoreId | 'all';
  minPrice: number;
  maxPrice: number;
  minDiscount: number;
  sort: OfferSort;
}

export const defaultFilters: OfferFilters = {
  query: '', category: 'all', store: 'all', minPrice: 0,
  maxPrice: Number.POSITIVE_INFINITY, minDiscount: 0, sort: 'recent',
};

export function discountPercent(offer: Pick<Offer, 'currentPrice' | 'previousPrice'>): number {
  const previous = offer.previousPrice;
  if (!previous || !Number.isFinite(previous) || previous <= 0 || !Number.isFinite(offer.currentPrice) || offer.currentPrice < 0 || offer.currentPrice >= previous) return 0;
  return Math.round(((previous - offer.currentPrice) / previous) * 100);
}

const priceFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export function formatPrice(value: number): string {
  return priceFormatter.format(value);
}

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

/** Pure domain operation. Filters compose and never mutate the source catalog. */
export function filterOffers(offers: Offer[], filters: Partial<OfferFilters> = {}): Offer[] {
  const options = { ...defaultFilters, ...filters };
  const queryTerms = normalizeSearch(options.query).split(/\s+/).filter(Boolean);
  const result = offers.filter(offer => {
    if (options.category !== 'all' && offer.category !== options.category) return false;
    if (options.store !== 'all' && offer.store !== options.store) return false;
    if (Number.isFinite(options.minPrice) && offer.currentPrice < options.minPrice) return false;
    if (Number.isFinite(options.maxPrice) && offer.currentPrice > options.maxPrice) return false;
    if (discountPercent(offer) < options.minDiscount) return false;
    const categoryName = categories.find(category => category.id === offer.category)?.name ?? offer.category;
    const searchable = normalizeSearch(`${offer.name} ${categoryName}`);
    return queryTerms.every(term => searchable.includes(term));
  });
  return result.sort((a, b) => {
    if (options.sort === 'price-asc') return a.currentPrice - b.currentPrice;
    if (options.sort === 'price-desc') return b.currentPrice - a.currentPrice;
    if (options.sort === 'discount') return discountPercent(b) - discountPercent(a);
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
}
