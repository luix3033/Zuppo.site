import { defaultHome } from '../features/homepage/config';
import type { HomeConfig } from '../features/homepage/config';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Asterisk, BellRing, CheckCheck, Heart, Instagram, LayoutGrid, MessageCircle, Search, Send, ShieldCheck, ShoppingBag, Zap } from 'lucide-react';
import { TagMark } from '../components/Logo';
import {useSiteSettings} from '../hooks/useSiteSettings';
export function Hero({ content = defaultHome.hero }: { content?: HomeConfig['hero'] }) {
  const reduceMotion = useReducedMotion();
  const channels=useSiteSettings();const hasChannels=!!(channels.whatsappUrl||channels.telegramUrl||channels.instagramUrl);
  if(content.mode==='campaign'||content.mode==='artwork')return <section className={'campaign-hero campaign-hero-'+content.mode} aria-labelledby="hero-title">
   {content.mode==='artwork'?<><h1 className="sr-only" id="hero-title">{content.title}</h1><Link to={content.buttonUrl} className="campaign-artwork-link" aria-label={content.imageAlt||content.title}><picture>{content.mobileImage&&<source media="(max-width:600px)" srcSet={content.mobileImage}/>}<img src={content.image} alt={content.imageAlt||content.title} fetchPriority="high"/></picture></Link></>:<>
   {content.image?<picture className="campaign-backdrop">{content.mobileImage&&<source media="(max-width:600px)" srcSet={content.mobileImage}/>}<img src={content.image} alt="" fetchPriority="high" onError={e=>{e.currentTarget.style.display='none'}}/></picture>:<div className="campaign-motif" aria-hidden="true"><TagMark/><span>{content.sticker||'ZUPPO'}</span></div>}
   <div className="campaign-copy"><span className="eyebrow">{content.eyebrow}</span><h1 id="hero-title">{content.title}<br/><span>{content.highlight}</span></h1><p>{content.description}</p><Link to={content.buttonUrl} className="btn btn-primary">{content.buttonText}<ArrowUpRight size={19}/></Link></div></>}
  </section>;
  return <motion.section initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className={`hero-layout ${!hasChannels?'hero-no-teaser':''}`} aria-labelledby="hero-title"><div className="main-hero">
    <div className="hero-copy"><span className="hero-eyebrow"><span /> {content.eyebrow}</span><h1 id="hero-title">{content.title}<br /><span>{content.highlight}</span></h1><p>{content.description}</p><Link to={content.buttonUrl} className="btn btn-primary">{content.buttonText} <ArrowUpRight size={19} /></Link><div className="hero-bottom"><ShieldCheck size={14} /> {content.footnote}</div></div>
    {content.image ? <div className="hero-art hero-custom-art" aria-hidden="true"><img src={content.image} alt="" fetchPriority="high" onError={e=>{e.currentTarget.src='/favicon.svg'}} /></div> : <div className="hero-brand-art" aria-hidden="true"><span/><TagMark/><strong>ACHOU.<br/>É ZUPPO.</strong></div>}
  </div>{hasChannels&&<div className="community-teaser"><span className="teaser-eyebrow"><span /> CONECTE-SE À ZUPPO</span><div className="teaser-art" aria-hidden="true"><span className="bell-ring ring-one" /><span className="bell-ring ring-two" /><span className="bell-circle"><BellRing size={48} strokeWidth={1.5} /></span><span className="bell-notification"><Zap size={16} fill="currentColor" /></span><Asterisk className="teaser-star" size={23} strokeWidth={1.7} /></div><h2>{content.sideTitle}</h2><p>{content.sideDescription}</p><Link to={content.sideButtonUrl} className="teaser-cta">{content.sideButtonText} <ArrowUpRight size={19} /></Link></div>}</motion.section>;
}

export function Benefits({content=defaultHome.benefits}:{content?:string[]}) { return <div className="benefits"><div><Zap /><span>{content[0]}</span></div><div><ShieldCheck /><span>{content[1]}</span></div><div><Heart /><span>{content[2]}</span></div><div><CheckCheck /><span>{content[3]}</span></div></div>; }

export function FlashSection({content=defaultHome.flash}:{content?:HomeConfig['flash']}) { return <section className="flash-banner"><div className="flash-art" aria-hidden="true"><Zap size={52} fill="currentColor" /></div><div><span className="eyebrow">{content.eyebrow}</span><h2>{content.title}</h2><p>{content.description}</p></div><Link to={content.buttonUrl} className="btn btn-dark">{content.buttonText} <ArrowUpRight size={18} /></Link></section>; }

export function Community({ content=defaultHome.community }: { notify: (message: string) => void;content?:HomeConfig['community'] }) {
  const settings=useSiteSettings();
  const channels = [{ name: 'WhatsApp', Icon: MessageCircle, url: settings.whatsappUrl }, { name: 'Telegram', Icon: Send, url: settings.telegramUrl }, { name: 'Instagram', Icon: Instagram, url: settings.instagramUrl }].filter(c=>c.url);
  if(!channels.length)return null;
  return <section className="community-section" id="comunidade"><div className="community-copy"><span className="eyebrow"><span className="little-dot" /> {content.eyebrow}</span><h2>{content.title}<br /><span>{content.highlight}</span></h2><p>{content.description}</p><div className="community-channels">{channels.map(({ name, Icon, url }) => <a href={url!} key={name} target="_blank" rel="noopener noreferrer"><Icon size={18} />{name}<ArrowUpRight size={15} /></a>)}</div></div><div className="community-visual" aria-hidden="true"><span className="community-ring" /><TagMark /><Asterisk className="community-star" size={45} strokeWidth={1.7} /><span className="community-note">Chegou primeiro.<br />Chegou na <strong>zuppo.</strong></span></div></section>;
}

export function HowItWorks({content=defaultHome.how}:{content?:HomeConfig['how']}) { return <section className="how-section"><div className="section-heading"><div><span className="eyebrow">{content.eyebrow}</span><h2>{content.title}</h2></div><Link to="/sobre" className="text-link">Conheça a Zuppo <ArrowRight size={16} /></Link></div><div className="how-home-grid">{content.steps.map((step,i)=>({...step,Icon:[Search,LayoutGrid,ShoppingBag][i]})).map(({ Icon, title, description }, i) => <article key={title}><span className="how-icon"><Icon size={24} /></span><div><small>0{i + 1}</small><h3>{title}</h3><p>{description}</p></div></article>)}</div></section>; }

