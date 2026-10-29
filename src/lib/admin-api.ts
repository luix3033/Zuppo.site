let refreshInFlight: Promise<boolean> | null = null;
export async function refreshAdminSession(): Promise<boolean> {
  if(!refreshInFlight)refreshInFlight=fetch('/api/auth/refresh',{method:'POST',credentials:'same-origin'}).then(r=>r.ok).catch(()=>false).finally(()=>{refreshInFlight=null});
  return refreshInFlight;
}
/** Cookies HttpOnly: nenhum token ou senha é persistido pelo JavaScript. */
export async function adminFetch(path:string,options?:RequestInit):Promise<Response>{
  let response=await fetch(path,{...options,credentials:'same-origin'});
  if(response.status===401&&await refreshAdminSession())response=await fetch(path,{...options,credentials:'same-origin'});
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error('A API não respondeu corretamente. Verifique a configuração de publicação.');
  if(response.status===401||response.status===403)window.dispatchEvent(new Event('zuppo:session-expired'));
  return response;
}
