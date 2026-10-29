import { ArrowUpRight, Heart, ImageOff, Clock3 } from 'lucide-react';
import { useState } from 'react';
import type { Offer } from '../data/types';
import { formatPrice, discountPercent } from '../lib/offers';
import { stores } from '../data/catalog';
export function ProductImage({ offer, className = '' }: { offer: Offer; className?: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className={`image-fallback ${className}`}><ImageOff size={36} /><span>Imagem indisponível</span></div> : <img className={className} src={offer.image} alt={offer.name} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
export function StoreLabel({ store }: { store: string }) {
  return <span className={`store-label store-${store}`}><span className="store-dot" />{stores.find(item => item.id === store)?.name || store}</span>;
}
export function OfferCard({ offer, favorite, onFavorite, onOpen }: { offer: Offer; favorite: boolean; onFavorite: () => void; onOpen: () => void }) {
  const discount = discountPercent(offer);
  return <article className="offer-card">
    <div className="offer-visual">
      {discount > 0 && <span className="discount-badge">−{discount}%</span>}
      <button className={`favorite-button ${favorite ? 'saved' : ''}`} onClick={onFavorite} aria-label={`${favorite ? 'Remover' : 'Salvar'} ${offer.name} ${favorite ? 'dos' : 'nos'} favoritos`} aria-pressed={favorite}><Heart size={19} fill={favorite ? 'currentColor' : 'none'} /></button>
      <button type="button" onClick={onOpen} aria-label={`Ver oferta de ${offer.name}`} className="product-image-link"><ProductImage offer={offer} /></button>

    </div>
    <div className="offer-content"><StoreLabel store={offer.store} /><button type="button" onClick={onOpen} className="offer-title">{offer.name}</button>
      <div className="offer-pricing">{offer.previousPrice && <span className="old-price">{formatPrice(offer.previousPrice)}</span>}<strong>{formatPrice(offer.currentPrice)}</strong><span className="price-caption">Confira as condições na loja</span></div>
      <button className="offer-cta" onClick={onOpen}>Ver oferta <ArrowUpRight size={17} /></button>
      <div className="offer-updated"><Clock3 size={11} /><span>Atualizado em {new Date(offer.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}</span></div>
    </div>
  </article>;
}
