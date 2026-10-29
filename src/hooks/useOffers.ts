import {useCallback,useEffect,useRef,useState} from 'react';
import type {Offer} from '../data/types';
import {offerRepository} from '../lib/repository';
import type {OfferPage,OfferQuery} from '../lib/repository';
const emptyPage:OfferPage={items:[],total:0,page:1,limit:12,totalPages:1};
export function useOffers(query:OfferQuery={},enabled=true,refreshVersion=0){
  const [result,setResult]=useState<OfferPage>(emptyPage),[loading,setLoading]=useState(enabled),[error,setError]=useState<string|null>(null),[attempt,setAttempt]=useState(0);
  const key=JSON.stringify(query);const lastLoad=useRef(0);
  useEffect(()=>{
    const controller=new AbortController();
    if(!enabled){setResult(emptyPage);setLoading(false);setError(null);return;}
    setLoading(true);setError(null);
    const timer=window.setTimeout(()=>{
      offerRepository.query(JSON.parse(key),controller.signal).then(data=>{
        if(!controller.signal.aborted){setResult(data);lastLoad.current=Date.now();}
      }).catch((err:Error)=>{if(!controller.signal.aborted&&err.name!=='AbortError')setError(err.message||'Não conseguimos carregar as ofertas. Tente novamente.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    },150);
    return()=>{clearTimeout(timer);controller.abort();};
  },[key,enabled,attempt,refreshVersion]);
  useEffect(()=>{
    const refresh=()=>{if(enabled&&!document.hidden&&Date.now()-lastLoad.current>30000)setAttempt(n=>n+1);};
    window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);
  },[enabled]);
  return {offers:result.items,total:result.total,page:result.page,totalPages:result.totalPages,loading,error,retry:useCallback(()=>setAttempt(n=>n+1),[])};
}
export function useOffer(id:string|undefined,refreshVersion=0){
  const [offer,setOffer]=useState<Offer|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError(null);setOffer(null);
    if(!id){setLoading(false);return;}
    offerRepository.find(id,controller.signal).then(data=>{if(!controller.signal.aborted)setOffer(data);}).catch((err:Error)=>{if(!controller.signal.aborted)setError(err.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[id,refreshVersion,attempt]);
  return {offer,loading,error,retry:useCallback(()=>setAttempt(n=>n+1),[])};
}
