import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Clock3, Heart, ImageOff, Maximize2, ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Offer } from '../data/types';
import { discountPercent, formatPrice } from '../lib/offers';

type ProductPageProps = {
  offer: Offer | undefined;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenOffer: (offer: Offer) => void;
};

const storeNames = { amazon: 'Amazon', 'mercado-livre': 'Mercado Livre', shopee: 'Shopee' };
const dateLabel = (date: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'America/Sao_Paulo' }).format(new Date(date));
const unavailableImage = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#f5f5f5"/><path d="M240 240h120v120H240z" fill="none" stroke="#aaa" stroke-width="8"/><path d="m245 340 35-40 35 30 20-20 20 30" fill="none" stroke="#aaa" stroke-width="8"/><text x="300" y="420" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#777">Imagem indisponível</text></svg>')}`;

export function ProductPage({ offer, isFavorite, onToggleFavorite, onOpenOffer }: ProductPageProps) {
  const imageDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => { imageDialog.current?.close(); if (offer?.id) void fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'view',productId:offer.id})}).catch(()=>{}); }, [offer?.id]);

  if (!offer) {
    return <main className="container info-page"><div className="empty-state"><ImageOff size={42} /><h1>Esse achado não foi encontrado.</h1><p>A oferta pode ter sido removida. Que tal descobrir outras oportunidades?</p><Link className="btn btn-primary" to="/ofertas"><ArrowLeft size={17} /> Explorar ofertas</Link></div></main>;
  }

  const discount = discountPercent(offer);
  const isAvailable = offer.available && offer.status === 'active';
  const storeName = storeNames[offer.store];

  return (
    <main className="container product-page">
      <nav className="breadcrumbs" aria-label="Caminho da página"><Link to="/">Início</Link><ChevronRight size={14} /><Link to="/ofertas">Ofertas</Link><ChevronRight size={14} /><span aria-current="page">Detalhes do achado</span></nav>
      <div className="product-detail-grid">
        <section className="product-gallery" aria-label="Imagem do produto">
          <div className="product-detail-image">
            {discount > 0 && <span className="discount-badge">−{discount}% <span className="sr-only">de desconto</span></span>}
            <img src={offer.image} alt={offer.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = unavailableImage; }} />
            <button className="image-zoom icon-button" aria-label="Ampliar imagem do produto" onClick={() => imageDialog.current?.showModal()}><Maximize2 size={20} /></button>
          </div>
          <p className="image-caption">Imagem ilustrativa do produto.</p>
        </section>

        <section className="product-detail-info">

          <div className={`store-label store-${offer.store}`}><span className="store-dot" />{storeName}</div>
          <h1>{offer.name}</h1>
          <p className="product-description">{offer.description}</p>
          <div className="product-price-block">
            {offer.previousPrice && offer.previousPrice > offer.currentPrice ? <p className="previous-price">De <s>{formatPrice(offer.previousPrice)}</s></p> : null}
            <div className="detail-current-price">{formatPrice(offer.currentPrice)}</div>
            <p className="price-label">Consulte as condições de pagamento na loja.</p>
          </div>
          <div className="product-availability"><Check size={17} /><span>{isAvailable ? 'Oferta disponível na loja parceira' : 'Oferta indisponível'}</span></div>
          <div className="product-actions"><button className="btn btn-primary" disabled={!isAvailable} onClick={() => onOpenOffer(offer)}>{isAvailable ? 'Ver oferta' : 'Oferta indisponível'}<ArrowUpRight size={20} /></button><button className={`btn btn-secondary favorite-detail${isFavorite ? ' is-favorite' : ''}`} aria-pressed={isFavorite} onClick={onToggleFavorite}><Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />{isFavorite ? 'Salvo nos favoritos' : 'Salvar oferta'}</button></div>
          <p className="updated-at"><Clock3 size={14} /> Atualizado em {dateLabel(offer.updatedAt)}</p>
          <div className="product-trust-note"><ShieldCheck size={18} /><p>A compra acontece na loja parceira. Preços, disponibilidade e condições podem mudar.</p></div>
        </section>
      </div>

      <div className="product-meta-grid">
        <section className="info-card product-specs"><h2>Conheça o achado</h2><p>{offer.description}</p>{offer.specs && Object.keys(offer.specs).length > 0 && <dl>{Object.entries(offer.specs).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}<p className="source-note">Origem da informação: {offer.source}. Confirme as especificações na loja antes de comprar.</p></section>
        <section className="info-card product-history"><h2>Informações da oferta</h2><dl><div><dt>Publicada em</dt><dd>{dateLabel(offer.publishedAt)}</dd></div><div><dt>Última atualização</dt><dd>{dateLabel(offer.updatedAt)}</dd></div><div><dt>Loja</dt><dd>{storeName}</dd></div><div><dt>Identificador</dt><dd>{offer.id}</dd></div></dl>{offer.history && offer.history.length > 0 ? <div className="price-history"><h3>Histórico disponível </h3><ul>{offer.history.map((entry, index) => <li key={`${entry.date}-${index}`}><time dateTime={entry.date}>{dateLabel(entry.date)}</time><strong>{formatPrice(entry.price)}</strong><small>{entry.note}</small></li>)}</ul></div> : <p className="source-note">Ainda não há histórico de preços registrado para este produto.</p>}</section>
      </div>
      <p className="affiliate-disclosure">A Zuppo pode receber comissões por compras realizadas através dos links divulgados, sem custo adicional para você.</p>
      <dialog ref={imageDialog} className="product-image-dialog" aria-label={`Imagem ampliada: ${offer.name}`} onClick={(event) => { if (event.target === event.currentTarget) imageDialog.current?.close(); }}><button className="icon-button dialog-close" aria-label="Fechar imagem ampliada" onClick={() => imageDialog.current?.close()}><X size={23} /></button><img src={offer.image} alt={offer.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = unavailableImage; }} /><p>{offer.name}</p></dialog>
    </main>
  );
}
