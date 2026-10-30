import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {Download,RefreshCw,Share,CheckCircle2,ArrowRight} from 'lucide-react';
import {Link,useLocation} from 'react-router-dom';
import './pwa.css';
interface InstallEvent extends Event{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>}
type PwaState={installed:boolean;canInstall:boolean;install:()=>Promise<void>;busy:boolean;error:string};
const Context=createContext<PwaState>({installed:false,canInstall:false,install:async()=>{},busy:false,error:''});
export function PwaProvider({children}:{children:ReactNode}){
 const [installed,setInstalled]=useState(false),[prompt,setPrompt]=useState<InstallEvent|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[waiting,setWaiting]=useState<ServiceWorker|null>(null);
 const applying=useRef(false);const location=useLocation();
 useEffect(()=>{
  const standalone=window.matchMedia('(display-mode: standalone)');const sync=()=>setInstalled(standalone.matches||!!(navigator as Navigator&{standalone?:boolean}).standalone);sync();standalone.addEventListener('change',sync);
  const before=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent);};const complete=()=>{setInstalled(true);setPrompt(null);};window.addEventListener('beforeinstallprompt',before);window.addEventListener('appinstalled',complete);
  return()=>{standalone.removeEventListener('change',sync);window.removeEventListener('beforeinstallprompt',before);window.removeEventListener('appinstalled',complete);};
 },[]);
 useEffect(()=>{
  if(!import.meta.env.PROD||!('serviceWorker' in navigator))return;
  let stopped=false;let registration:ServiceWorkerRegistration|undefined;let checked=0;
  const controller=()=>{if(applying.current)window.location.reload();};navigator.serviceWorker.addEventListener('controllerchange',controller);
  const start=async()=>{try{registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});if(stopped)return;if(registration.waiting)setWaiting(registration.waiting);registration.addEventListener('updatefound',()=>{const worker=registration?.installing;worker?.addEventListener('statechange',()=>{if(!stopped&&worker.state==='installed'&&navigator.serviceWorker.controller)setWaiting(worker);});});}catch{/* Installation remains optional; the online site still works. */}};
  const check=()=>{if(!document.hidden&&Date.now()-checked>60000){checked=Date.now();void registration?.update().catch(()=>{});}};
  if(document.readyState==='complete')void start();else window.addEventListener('load',start,{once:true});window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
  return()=>{stopped=true;window.removeEventListener('load',start);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);navigator.serviceWorker.removeEventListener('controllerchange',controller);};
 },[]);
 const install=async()=>{if(!prompt||busy)return;setBusy(true);setError('');try{await prompt.prompt();await prompt.userChoice;setPrompt(null);}catch{setError('Não foi possível iniciar a instalação. Use o menu do navegador.');}finally{setBusy(false);}};
 return <Context.Provider value={{installed,canInstall:!!prompt,install,busy,error}}>{children}{waiting&&!location.pathname.startsWith('/zuppo-admin')&&<div className="pwa-update" role="status"><RefreshCw size={18}/><span>Uma nova versão da Zuppo está pronta.</span><button onClick={()=>{applying.current=true;waiting.postMessage({type:'SKIP_WAITING'});}}>Atualizar agora</button><button aria-label="Atualizar mais tarde" onClick={()=>setWaiting(null)}>Depois</button></div>}</Context.Provider>;
}
export function InstallPage(){
 const {installed,canInstall,install,busy,error}=useContext(Context);
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 return <main className="container install-page"><section className="install-hero"><img src="/icons/icon-512.png" alt="Ícone do aplicativo Zuppo com o Zuppinho" width="160" height="160"/><div><span className="eyebrow">SEUS ACHADOS, SEMPRE POR PERTO</span><h1>A Zuppo na sua tela inicial.</h1><p>Instale o app para abrir a Zuppo com um toque, conferir ofertas e guardar seus favoritos neste aparelho.</p>{installed?<p className="install-success"><CheckCircle2 size={20}/>Você já está usando o aplicativo Zuppo.</p>:canInstall?<button className="btn btn-primary" disabled={busy} onClick={()=>void install()}><Download size={20}/>{busy?'Abrindo instalação…':'Instalar Zuppo'}</button>:<a className="btn btn-primary" href="#como-instalar">Ver como instalar<ArrowRight size={18}/></a>}{error&&<p role="alert">{error}</p>}<small>Sem download pela loja. A instalação é feita pelo seu navegador.</small></div></section><section className="install-instructions" id="como-instalar"><h2>{ios?'No iPhone ou iPad':'Como instalar no seu celular'}</h2><div className="install-options"><article><h3><Share size={20}/>iPhone e iPad</h3><ol><li>Abra a Zuppo no Safari.</li><li>Toque em Compartilhar.</li><li>Escolha “Adicionar à Tela de Início” e confirme em “Adicionar”. Se aparecer, mantenha “Abrir como App” ativado.</li></ol></article><article><h3><Download size={20}/>Android</h3><ol><li>Abra a Zuppo no Chrome.</li><li>Use “Instalar Zuppo” nesta página quando disponível, ou abra o menu ⋮.</li><li>Escolha “Instalar app” ou “Adicionar à tela inicial” e confirme.</li></ol></article></div><p>As opções variam conforme navegador e versão do sistema. No computador, procure o ícone de instalação na barra de endereço do Chrome ou Edge.</p></section><section className="info-card install-notes"><h2>Conectado com as oportunidades.</h2><p>Ofertas, preços e status do Zuppinho precisam de internet para permanecer atualizados. Sem conexão, o app mostra uma tela de orientação. Seus favoritos continuam guardados no navegador deste aparelho.</p><p>Ao receber uma nova versão, você poderá escolher quando atualizar. O aplicativo não envia notificações nesta versão.</p><Link className="text-link" to="/ofertas">Explorar ofertas<ArrowRight size={16}/></Link></section></main>;
}
