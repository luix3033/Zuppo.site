import type { CategoryId, StoreId } from './types';

export const categories: { id: CategoryId; name: string }[] = [
  { id: 'games', name: 'Games' },
  { id: 'informatica', name: 'Informática' },
  { id: 'celulares', name: 'Celulares' },
  { id: 'casa', name: 'Casa' },
  { id: 'eletrodomesticos', name: 'Eletrodomésticos' },
  { id: 'esporte', name: 'Esporte' },
  { id: 'beleza', name: 'Beleza' },
  { id: 'bebes', name: 'Bebês' },
  { id: 'pets', name: 'Pets' },
  { id: 'moda', name: 'Moda' },
];

export const stores: { id: StoreId; name: string }[] = [
  { id: 'amazon', name: 'Amazon' },
  { id: 'mercado-livre', name: 'Mercado Livre' },
  { id: 'shopee', name: 'Shopee' },
];
