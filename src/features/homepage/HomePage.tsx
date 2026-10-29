import './public-home.css';
import {useEffect,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import {Hero,Benefits,FlashSection,Community,HowItWorks} from '../../pages/HomeSections';
import {Catalog} from '../offers/OfferCatalog';
import type {CatalogProps} from '../offers/OfferCatalog';
import {defaultHome} from './config';
import type {HomeConfig,HomeSection} from './config';
import {categories} from '../../data/catalog';
import {CategoryIcon} from '../../components/CategoryIcon';

export function useHomeConfig(){const [config,setConfig]=useState(defaultHome);useEffect(()=>{const c=new AbortController();fetch('/api/homepage',{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject()).then(d=>setConfig(d.config)).catch(()=>{});return()=>c.abort()},[]);return config}
export function HomePage({config,notify,...props}:CatalogProps&{config:HomeConfig;notify:(s:string)=>void}){
 const navigate=useNavigate();
 function section(s:HomeSection){switch(s.type){
 case 'hero':return <Hero content={config.hero}/>;
 case 'benefits':return <Benefits content={config.benefits}/>;
 case 'categories':return <section className="categories-section" id="categorias"><div className="section-heading compact"><div><span className="eyebrow">{config.categories.eyebrow}</span><h2>{config.categories.title}</h2></div><Link to="/ofertas" className="text-link">Ver tudo</Link></div><div className="category-grid">{config.categories.ids.map(id=>{const c=categories.find(c=>c.id===id);return c?<button className="category-item" key={id} onClick={()=>navigate('/ofertas?categoria='+id)}><span className="category-icon"><CategoryIcon id={id}/></span><span>{c.name}</span></button>:null})}</div></section>;
 case 'offers':{const selection={...(s.store==='all'?{}:{store:s.store}),...(s.mode==='featured'?{featured:true}:{}),...(s.mode==='flash'?{flash:true}:{}),...(s.mode==='manual'?{ids:s.offerIds}:{}),...(s.mode==='category'&&s.category!=='all'?{category:s.category}:{}),...(s.mode==='discount'?{minDiscount:30}:{})};return <Catalog home {...props} sectionQuery={selection} homeOptions={{title:s.title,description:s.description,limit:s.limit}}/>;}
 case 'flash':return <FlashSection content={config.flash}/>;
 case 'community':return <Community content={config.community} notify={notify}/>;
 case 'how':return <HowItWorks content={config.how}/>;
 case 'banner':return <section className={'cms-banner cms-banner-'+s.tone}>{s.image&&<img src={s.image} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none'}}/>}<div><h2>{s.title}</h2><p>{s.description}</p>{s.buttonText&&s.buttonUrl&&<Link className="btn btn-primary" to={s.buttonUrl}>{s.buttonText}<ArrowUpRight size={18}/></Link>}</div></section>;
 }}
 return <main className="container home-page">{config.sections.filter(s=>s.enabled).map(s=><div className="cms-section" key={s.id} data-section-type={s.type}>{section(s)}</div>)}</main>
}
