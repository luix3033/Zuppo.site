import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { categories, stores } from '../src/data/catalog';
import { demoOffers } from './fixtures/offers';
import type { Offer } from '../src/data/types';
import { discountPercent, filterOffers, formatPrice } from '../src/lib/offers';

const createOffer = (overrides: Partial<Offer>): Offer => ({
  id: 'base', name: 'Cafeteira elétrica', description: 'Exemplo para teste de domínio',
  category: 'eletrodomesticos', store: 'amazon', image: '/images/coffee-maker.png',
  currentPrice: 100, previousPrice: 200, affiliateUrl: null,
  publishedAt: '2026-01-01T12:00:00Z', updatedAt: '2026-01-01T12:00:00Z',
  available: true, status: 'active', source: 'Teste', isDemo: true,
  featured: false, flash: false, ...overrides,
});
const fixtures = [
  createOffer({ id: 'coffee-a' }),
  createOffer({ id: 'coffee-b', name: 'Cafeteira compacta', store: 'shopee', currentPrice: 80, previousPrice: 100, publishedAt: '2026-01-03T12:00:00Z' }),
  createOffer({ id: 'notebook', name: 'Notebook Café', category: 'informatica', currentPrice: 120, previousPrice: 150, publishedAt: '2026-01-02T12:00:00Z' }),
  createOffer({ id: 'coffee-c', name: 'Cafeteira inox', currentPrice: 150, previousPrice: 200, publishedAt: '2026-01-04T12:00:00Z' }),
];
const ids = (offers: Offer[]) => offers.map(offer => offer.id);

test('a busca encontra o nome da categoria sem depender dos acentos', () => {
  assert.deepEqual(ids(filterOffers(fixtures, { query: '  ELETRODOMÉSTICOS  ' })), ['coffee-c', 'coffee-b', 'coffee-a']);
  assert.deepEqual(ids(filterOffers(fixtures, { query: 'informatica café' })), ['notebook']);
});

test('busca, categoria, loja, preço e desconto compõem uma única seleção', () => {
  assert.deepEqual(ids(filterOffers(fixtures, {
    query: 'eletrica eletrodomesticos', category: 'eletrodomesticos', store: 'amazon',
    minPrice: 90, maxPrice: 110, minDiscount: 30,
  })), ['coffee-a']);
  assert.equal(filterOffers(fixtures, { category: 'eletrodomesticos', store: 'shopee', minDiscount: 30 }).length, 0);
});

test('limites de preço são inclusivos e uma faixa invertida não retorna ofertas', () => {
  assert.deepEqual(ids(filterOffers(fixtures, { minPrice: 100, maxPrice: 120, sort: 'price-asc' })), ['coffee-a', 'notebook']);
  assert.equal(filterOffers(fixtures, { minPrice: 151, maxPrice: 100 }).length, 0);
  assert.equal(filterOffers(fixtures, { query: 'produto inexistente' }).length, 0);
});

test('cada ordenação segue o critério solicitado sem modificar a lista original', () => {
  const before = structuredClone(fixtures);
  assert.deepEqual(ids(filterOffers(fixtures, { sort: 'price-asc' })), ['coffee-b', 'coffee-a', 'notebook', 'coffee-c']);
  assert.deepEqual(ids(filterOffers(fixtures, { sort: 'price-desc' })), ['coffee-c', 'notebook', 'coffee-a', 'coffee-b']);
  assert.deepEqual(ids(filterOffers(fixtures, { sort: 'recent' })), ['coffee-c', 'coffee-b', 'notebook', 'coffee-a']);
  const discounts = filterOffers(fixtures, { sort: 'discount' }).map(discountPercent);
  assert.deepEqual(discounts, [50, 25, 20, 20]);
  assert.deepEqual(fixtures, before);
});

test('o desconto é calculado somente com preços que o permitem', () => {
  assert.equal(discountPercent({ currentPrice: 75, previousPrice: 100 }), 25);
  assert.equal(discountPercent({ currentPrice: 99.9, previousPrice: 149.9 }), 33);
  assert.equal(discountPercent({ currentPrice: 0, previousPrice: 100 }), 100);
  for (const offer of [
    { currentPrice: 100 },
    { currentPrice: 100, previousPrice: 0 },
    { currentPrice: 100, previousPrice: 100 },
    { currentPrice: 110, previousPrice: 100 },
    { currentPrice: -1, previousPrice: 100 },
    { currentPrice: 100, previousPrice: Number.NaN },
    { currentPrice: 100, previousPrice: Number.POSITIVE_INFINITY },
    { currentPrice: Number.NaN, previousPrice: 100 },
  ]) assert.equal(discountPercent(offer), 0, JSON.stringify(offer));
});

test('valores monetários seguem o formato brasileiro e não ocultam centavos', () => {
  assert.equal(formatPrice(1299.9).replace(/\s/g, ' '), 'R$ 1.299,90');
  assert.equal(formatPrice(0).replace(/\s/g, ' '), 'R$ 0,00');
});

test('o catálogo tem registros consistentes e cobre todas as categorias', () => {
  assert.ok(demoOffers.length >= 12, 'O catálogo precisa permitir testar a paginação.');
  assert.equal(new Set(demoOffers.map(offer => offer.id)).size, demoOffers.length, 'IDs devem ser únicos.');
  for (const category of categories) assert.ok(demoOffers.some(offer => offer.category === category.id), `Categoria sem oferta: ${category.id}`);
  for (const offer of demoOffers) {
    assert.ok(offer.id && offer.name && offer.description && offer.source);
    assert.ok(categories.some(category => category.id === offer.category), offer.id);
    assert.ok(stores.some(store => store.id === offer.store), offer.id);
    assert.ok(Number.isFinite(offer.currentPrice) && offer.currentPrice > 0, offer.id);
    assert.ok(offer.previousPrice === undefined || (Number.isFinite(offer.previousPrice) && offer.previousPrice > 0), offer.id);
    assert.ok(Number.isFinite(Date.parse(offer.publishedAt)), offer.id);
    assert.ok(Number.isFinite(Date.parse(offer.updatedAt)), offer.id);
    assert.ok(Date.parse(offer.updatedAt) >= Date.parse(offer.publishedAt), offer.id);
    assert.ok(offer.image.startsWith('/images/'), offer.id);
    assert.ok(existsSync(resolve('public', offer.image.slice(1))), `Imagem ausente: ${offer.image}`);
    for (const entry of offer.history || []) {
      assert.ok(Number.isFinite(Date.parse(entry.date)), offer.id);
      assert.ok(Number.isFinite(entry.price) && entry.price >= 0, offer.id);
      assert.ok(entry.note, offer.id);
    }
  }
});

test('a demonstração não inclui links de afiliado ou expirações fictícias', () => {
  for (const offer of demoOffers) {
    assert.equal(offer.isDemo, true, offer.id);
    assert.equal(offer.affiliateUrl, null, offer.id);
    assert.equal(offer.expiresAt ?? null, null, offer.id);
    assert.match(offer.source, /demonstrativ/i, offer.id);
  }
});
