import {InstallPage} from './features/pwa/Pwa';
import {ZuppinhoStatus} from './features/status/ZuppinhoStatus';
import {SiteSettingsProvider} from './hooks/useSiteSettings';
import {ThemeStyle} from './features/homepage/Appearance';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, ShieldCheck, X } from 'lucide-react';
import { Header, Footer, MobileNav } from './components/layout/SiteLayout';
import {HomePreview} from './features/homepage/HomePreview';
import {HomePage,useHomeConfig} from './features/homepage/HomePage';
import { Catalog, Empty, Skeletons } from './features/offers/OfferCatalog';
import type { CatalogProps } from './features/offers/OfferCatalog';
import {useOffers,useOffer} from './hooks/useOffers';
import { useFavorites } from './hooks/useFavorites';
import type { Offer } from './data/types';
import { AboutPage, ContactPage, PrivacyPage, TermsPage } from './pages/InfoPages';
import { stores } from './data/catalog';
import { affiliateDestination } from './lib/redirect';
const AdminPage=lazy(()=>import('./pages/AdminPage').then(m=>({default:m.AdminPage})));
import { ProductPage } from './pages/ProductPage';
function ProductRoute({favorites,toggle,openOffer,refreshVersion}:CatalogProps){
 const {id}=useParams();const {offer,loading,error,retry}=useOffer(id,refreshVersion);
 return loading?<main className="container"><Skeletons/></main>:error?<main className="container"><Empty error title="Não conseguimos carregar a oferta." description={error} action={retry} actionText="Tentar novamente"/></main>:<ProductPage offer={offer||undefined} isFavorite={!!id&&favorites.includes(id)} onToggleFavorite={()=>id&&toggle(id)} onOpenOffer={openOffer}/>;
}
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => { const frame = requestAnimationFrame(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }); else window.scrollTo({ top: 0, behavior: 'instant' }); }); return () => cancelAnimationFrame(frame); }, [pathname, hash]);
  useEffect(() => { const titles: Record<string, string> = { '/': 'Ofertas que chegam primeiro.', '/ofertas': 'Todos os achados', '/favoritos': 'Seus favoritos', '/sobre': 'Sobre a Zuppo', '/contato': 'Fale com a Zuppo', '/instalar':'Instalar aplicativo', '/privacidade': 'Privacidade', '/termos': 'Termos de uso' }; document.title = `Zuppo — ${titles[pathname] || 'Detalhes do achado'}`; }, [pathname]);
  return null;
}

export default function App() {
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => { setToast(message); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 4500); }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  const { favorites, toggle } = useFavorites(notify);
  const [refreshVersion,setRefreshVersion]=useState(0);
  const refreshCatalog=useCallback(()=>setRefreshVersion(n=>n+1),[]);
  const favoriteState=useOffers({ids:favorites.slice(0,200),limit:1},favorites.length>0,refreshVersion);
  const homeConfig = useHomeConfig();
  const [dark, setDark] = useState(() => { try { const value = localStorage.getItem('zuppo:theme'); return value ? value === 'dark' : false; } catch { return false; } });
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; try { localStorage.setItem('zuppo:theme', dark ? 'dark' : 'light'); } catch { /* Theme still works for the current session. */ } }, [dark]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const redirectDialog = useRef<HTMLDialogElement>(null);
  const location = useLocation();
  useEffect(() => { redirectDialog.current?.close(); }, [location.pathname]);
  const openOffer = (offer: Offer) => {
    void fetch('/api/events', {method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'view',productId:offer.id})}).catch(()=>{});
    if (!offer.available || offer.status === 'expired' || (offer.expiresAt && new Date(offer.expiresAt).getTime() <= Date.now())) { notify('Esta oferta está indisponível. Explore os outros achados.'); return; }
    setSelectedOffer(offer); redirectDialog.current?.showModal();
  };

  const destination = selectedOffer ? affiliateDestination(selectedOffer) : null;
  const destinationStore = stores.find(store => store.id === selectedOffer?.store)?.name || 'loja parceira';
  const catalogProps: CatalogProps = {favorites,toggle,openOffer,refreshVersion};
  if (location.pathname === '/zuppo-admin/preview') return <SiteSettingsProvider><HomePreview {...catalogProps}/></SiteSettingsProvider>;
  if (location.pathname.startsWith('/zuppo-admin')) return <Suspense fallback={<main className="container info-page">Carregando administração…</main>}><AdminPage refresh={refreshCatalog}/></Suspense>;
  return <SiteSettingsProvider><ThemeStyle appearance={homeConfig.appearance}/><a className="skip-link" href="#conteudo">Pular para o conteúdo</a><ScrollManager /><Header announcement={homeConfig.announcement} favoriteCount={favoriteState.total} dark={dark} toggleTheme={() => setDark(!dark)} /><div id="conteudo" tabIndex={-1}><Routes>
    <Route path="/" element={<HomePage config={homeConfig} notify={notify} {...catalogProps}/>} />
    <Route path="/ofertas" element={<main className="container catalog-page"><div className="breadcrumbs"><Link to="/">Início</Link><ChevronRight size={13} /><span>Ofertas</span></div><Catalog {...catalogProps} /></main>} />
    <Route path="/favoritos" element={<main className="container catalog-page favorites-page"><div className="breadcrumbs"><Link to="/">Início</Link><ChevronRight size={13} /><span>Favoritos</span></div><Catalog onlyFavorites {...catalogProps} /><p className="local-storage-note"><ShieldCheck size={15} /> Seus favoritos ficam salvos apenas neste navegador.</p></main>} />
    <Route path="/instalar" element={<InstallPage/>}/><Route path="/produto/:id" element={<ProductRoute {...catalogProps} />} /><Route path="/sobre" element={<AboutPage />} /><Route path="/contato" element={<ContactPage />} /><Route path="/privacidade" element={<PrivacyPage />} /><Route path="/termos" element={<TermsPage />} />
    <Route path="*" element={<main className="container info-page"><Empty title="Esse caminho ainda não é um achado." description="A página que você procura não foi encontrada." /><div className="empty-browse"><Link to="/" className="btn btn-primary">Voltar ao início <ArrowRight size={16} /></Link></div></main>} />
  </Routes></div><ZuppinhoStatus/><Footer /><MobileNav count={favoriteState.total} />
  <div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite">{toast && <><span><Check size={17} /></span>{toast}<button onClick={() => setToast('')} aria-label="Fechar aviso"><X size={15} /></button></>}</div>
  <dialog ref={redirectDialog} className="redirect-dialog" aria-labelledby="redirect-dialog-title" onClick={e => { if (e.target === e.currentTarget) redirectDialog.current?.close(); }}><button className="icon-button dialog-close" onClick={() => redirectDialog.current?.close()} aria-label="Fechar"><X size={20} /></button><img className="redirect-mascot" src="/images/zuppinho-oferta.png" alt="Zuppinho com sacolas de compras" width="130" height="120" decoding="async"/><span className="eyebrow">{destination ? 'VOCÊ ESTÁ SAINDO DA ZUPPO' : 'OFERTA INDISPONÍVEL'}</span><h2 id="redirect-dialog-title">{destination ? `Você vai para a ${destinationStore}.` : `Seu achado na ${destinationStore}.`}</h2><p><strong>{selectedOffer?.name}</strong></p><p>{destination ? `Ao continuar, você será redirecionado para a ${destinationStore} para consultar o produto e concluir a compra.` : `O link desta oferta não está disponível. Confira os outros achados da Zuppo.`}</p>{destination && <><p>Confira preço, disponibilidade, frete e condições diretamente na loja.</p><p className="redirect-domain">Destino: {new URL(destination).hostname}</p><p>A Zuppo pode receber uma comissão, sem custo adicional para você.</p></>}<div className="dialog-actions">{destination && <a className="btn btn-primary" href={'/go/'+encodeURIComponent(selectedOffer!.id)} rel="sponsored noopener noreferrer" onClick={() => redirectDialog.current?.close()}>Ir para {destinationStore} <ArrowRight size={17} /></a>}<button className={destination ? 'text-link' : 'btn btn-primary'} onClick={() => redirectDialog.current?.close()}>{destination ? 'Continuar na Zuppo' : 'Continuar explorando'}</button></div></dialog>
  </SiteSettingsProvider>;
}
