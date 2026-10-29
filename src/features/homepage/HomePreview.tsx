import {adminFetch} from '../../lib/admin-api';
import {ThemeStyle} from './Appearance';
import {useEffect,useState} from 'react';
import {HomePage} from './HomePage';
import type {HomeConfig} from './config';
import type {CatalogProps} from '../offers/OfferCatalog';
import {Header,Footer} from '../../components/layout/SiteLayout';
export function HomePreview(props:CatalogProps){
 const [config,setConfig]=useState<HomeConfig|null>(null),[error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();const meta=document.createElement('meta');meta.name='robots';meta.content='noindex,nofollow';document.head.append(meta);adminFetch('/api/admin/homepage',{signal:c.signal}).then(r=>{if(!r.ok)throw Error('Entre como administrador para visualizar o rascunho.');return r.json()}).then(d=>setConfig(d.draft.config)).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>{c.abort();meta.remove()}},[]);
 if(error)return <main className="container info-page"><p role="alert">{error}</p><a className="btn btn-primary" target="_top" href="/zuppo-admin/login">Entrar no admin</a></main>;
 if(!config)return <main className="container info-page">Carregando prévia…</main>;
 return <><ThemeStyle appearance={config.appearance}/><div className="cms-preview-banner"><span>PRÉVIA DO RASCUNHO · Este conteúdo ainda não foi publicado.</span><a target="_top" href="/zuppo-admin/painel?tab=home">Voltar ao editor</a></div><Header favoriteCount={0} dark={false} toggleTheme={()=>{}} announcement={config.announcement}/><HomePage config={config} {...props} openOffer={()=>{}} toggle={()=>{}} notify={()=>{}}/><Footer/></>
}
