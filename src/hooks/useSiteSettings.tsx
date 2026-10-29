import {createContext,useContext,useEffect,useState} from 'react';
import type {ReactNode} from 'react';
export interface SiteSettings {contactEmail:string;whatsappUrl:string;telegramUrl:string;instagramUrl:string}
const empty:SiteSettings={contactEmail:'',whatsappUrl:'',telegramUrl:'',instagramUrl:''};
const Context=createContext<SiteSettings>(empty);
export const useSiteSettings=()=>useContext(Context);
export function SiteSettingsProvider({children}:{children:ReactNode}){const [settings,setSettings]=useState(empty);useEffect(()=>{const c=new AbortController();fetch('/api/settings',{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(setSettings).catch(()=>{});return()=>c.abort()},[]);return <Context.Provider value={settings}>{children}</Context.Provider>}
