export type CategoryId = 'games' | 'informatica' | 'celulares' | 'casa' | 'eletrodomesticos' | 'esporte' | 'beleza' | 'bebes' | 'pets' | 'moda';
export type StoreId = 'amazon' | 'mercado-livre' | 'shopee';

export interface OfferPriceRecord {
  date: string;
  price: number;
  note: string;
}

/** A normalized record, independent from the future provider or API. */
export interface Offer {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
  store: StoreId;
  image: string;
  currentPrice: number;
  previousPrice?: number;
  affiliateUrl: string | null;
  publishedAt: string;
  updatedAt: string;
  available: boolean;
  status: 'draft' | 'active' | 'expired';
  source: string;
  isDemo: boolean;
  featured: boolean;
  flash: boolean;
  expiresAt?: string | null;
  specs?: Record<string, string>;
  history?: OfferPriceRecord[];
  shipping?: string;
}
