import {readJsonBody,readBodyBytes,enforceRateLimit,RequestSecurityError} from './request-security.js';
export class AdminAuthError extends Error {
  constructor(message, status = 401) {super(message);this.status = status;}
}
function supabaseAuthConfig(env) {
  const origin = new URL(env.SUPABASE_URL);
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.username || origin.password || origin.search || origin.hash || !env.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')) throw Error('Configuração Supabase inválida');
  return {origin, key: env.SUPABASE_PUBLISHABLE_KEY};
}
function sessionCookieNames(request) {
  const secure = new URL(request.url).protocol === 'https:';
  return {access:secure?'__Host-zuppo-access':'zuppo-access',refresh:secure?'__Host-zuppo-refresh':'zuppo-refresh',secure};
}
function sessionCookieValue(request, name) {
  const raw = (request.headers.get('Cookie') || '').split(';').find(c => c.trim().startsWith(name + '='));
  if (!raw) return null;
  const value = raw.trim().slice(name.length + 1);
  return /^[A-Za-z0-9._~-]{1,4000}$/.test(value) ? value : null;
}
function sessionCookies(request, session) {
  const names = sessionCookieNames(request);
  const attrs = '; Path=/; HttpOnly' + (names.secure ? '; Secure; SameSite=None; Partitioned' : '; SameSite=Lax');
  return [names.access + '=' + (session?.access_token || '') + '; Max-Age=' + (session?Math.min(3600,Number(session.expires_in)||3600):0) + attrs,
    names.refresh + '=' + (session?.refresh_token || '') + '; Max-Age=' + (session?604800:0) + attrs];
}
function authResponse(data, status = 200, cookies = [], retryAfter) {
  const headers = new Headers({'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'});
  for (const value of cookies) headers.append('Set-Cookie',value);
  if(retryAfter)headers.set('Retry-After',String(retryAfter));
  return new Response(JSON.stringify(data),{status,headers});
}
async function validateAdminToken(env, token, fetcher) {
  const {origin,key} = supabaseAuthConfig(env);
  const headers = {apikey:key,Authorization:'Bearer ' + token};
  const userResponse = await fetcher(new URL('/auth/v1/user',origin),{headers,signal:AbortSignal.timeout(12000),cache:'no-store'});
  if (userResponse.status === 401 || userResponse.status === 403) throw new AdminAuthError('Sua sessão expirou. Entre novamente.');
  if (!userResponse.ok) throw new AdminAuthError('Não foi possível validar sua sessão. Tente novamente.',503);
  const user = await userResponse.json();
  if (typeof user.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(user.id)) throw new AdminAuthError('Sessão inválida.');
  const params = new URLSearchParams({select:'user_id',user_id:'eq.'+user.id,limit:'1'});
  const membership = await fetcher(new URL('/rest/v1/admin_memberships?' + params,origin),{headers,signal:AbortSignal.timeout(12000),cache:'no-store'});
  if (!membership.ok) throw new AdminAuthError('Não foi possível verificar a permissão administrativa.',membership.status === 401 ? 401 : 503);
  const rows = await membership.json();
  if (!Array.isArray(rows) || !rows.some(r => r.user_id === user.id)) throw new AdminAuthError('Esta conta não tem permissão de administrador.',403);
  return {token,userId:user.id,email:user.email || ''};
}
export async function getSupabaseAdmin(request, env, fetcher = fetch) {
  const token = sessionCookieValue(request,sessionCookieNames(request).access);
  return token ? validateAdminToken(env,token,fetcher) : null;
}
export async function handleAdminAuth(request, env, fetcher = fetch) {
  if (request.method !== 'POST') return authResponse({error:'Método não permitido.'},405);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return authResponse({error:'Origem inválida.'},403);
  const path = new URL(request.url).pathname;
  const {origin,key} = supabaseAuthConfig(env);
  if (!['/api/auth/login','/api/auth/refresh','/api/auth/logout'].includes(path)) return authResponse({error:'Rota não encontrada.'},404);
  if (path === '/api/auth/logout') return endAdminSession(request,env,fetcher);
  const refreshing = path.endsWith('/refresh');
  try {
    await enforceRateLimit(request,env,{binding:'AUTH_RATE_LIMITER',keyPrefix:refreshing?'auth-refresh':'auth-login',limit:refreshing?60:30});
  } catch(error) {
    if(error instanceof RequestSecurityError)return authResponse({error:error.message},error.status,[],error.retryAfter);
    throw error;
  }
  let payload;
  if (refreshing) {
    await readBodyBytes(request,4096);
    const refresh = sessionCookieValue(request,sessionCookieNames(request).refresh);
    if (!refresh) return authResponse({error:'Entre novamente para continuar.'},401,sessionCookies(request,null));
    payload = {refresh_token:refresh};
  } else {
    const input = await readJsonBody(request,4096);
    if (!input || typeof input !== 'object' || typeof input.email !== 'string' || input.email.length > 254 || !input.email.trim().includes('@') || typeof input.password !== 'string' || !input.password || input.password.length > 1024) return authResponse({error:'Informe seu e-mail e sua senha.'},400);
    payload = {email:input.email.trim(),password:input.password};
  }
  const response = await fetcher(new URL('/auth/v1/token?grant_type='+(refreshing?'refresh_token':'password'),origin),{
    method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000),cache:'no-store'});
  if (!response.ok) {
    const status = response.status === 429 ? 429 : response.status >= 500 ? 503 : 401;
    return authResponse({error:status===429?'Muitas tentativas. Aguarde antes de tentar novamente.':status===503?'O serviço de login está indisponível. Tente novamente.':refreshing?'Sua sessão expirou. Entre novamente.':'Não foi possível entrar. Confira e-mail, senha e confirmação da conta.'},status,refreshing?sessionCookies(request,null):[]);
  }
  const session = await response.json();
  if (!validAdminSession(session)) throw Error('Sessão de autenticação inválida');
  const admin = await validateAdminToken(env,session.access_token,fetcher);
  return authResponse({authenticated:true,email:admin.email,authProvider:'supabase',catalogReadOnly:false},200,sessionCookies(request,session));
}

function validAdminSession(session) {
  return !!session && [session.access_token,session.refresh_token].every(v=>typeof v==='string'&&/^[A-Za-z0-9._~-]{1,4000}$/.test(v));
}
async function endAdminSession(request,env,fetcher) {
  const clear=sessionCookies(request,null);
  const {origin,key}=supabaseAuthConfig(env);
  const names=sessionCookieNames(request);
  let access=sessionCookieValue(request,names.access);
  const refresh=sessionCookieValue(request,names.refresh);
  try {
    await readBodyBytes(request,4096);
    if(!access&&!refresh)return authResponse({ok:true,localSessionCleared:true},200,clear);
    await enforceRateLimit(request,env,{binding:'AUTH_RATE_LIMITER',keyPrefix:'auth-logout',limit:30});
    async function revoke(token) {
      return fetcher(new URL('/auth/v1/logout?scope=local',origin),{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token},signal:AbortSignal.timeout(8000),cache:'no-store'});
    }
    if(access) {
      const result=await revoke(access);
      if(result.ok)return authResponse({ok:true,localSessionCleared:true,remoteRevocationConfirmed:true},200,clear);
      if(![401,403].includes(result.status))throw Error('Revogação indisponível');
      access=null;
    }
    if(refresh) {
      const response=await fetcher(new URL('/auth/v1/token?grant_type=refresh_token',origin),{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refresh}),signal:AbortSignal.timeout(8000),cache:'no-store'});
      if([400,401,403].includes(response.status))return authResponse({ok:true,localSessionCleared:true,credentialsExpired:true},200,clear);
      if(!response.ok)throw Error('Renovação indisponível');
      const session=await response.json();
      if(!validAdminSession(session))throw Error('Resposta de sessão inválida');
      const result=await revoke(session.access_token);
      if(!result.ok)throw Error('Revogação indisponível');
      return authResponse({ok:true,localSessionCleared:true,remoteRevocationConfirmed:true},200,clear);
    }
    return authResponse({ok:true,localSessionCleared:true,credentialsExpired:true},200,clear);
  }catch(error) {
    const status=error instanceof RequestSecurityError?error.status:503;
    const message=error instanceof RequestSecurityError?error.message:'A sessão foi removida deste navegador, mas não foi possível confirmar o encerramento remoto. Entre e saia novamente para tentar revogar a sessão.';
    return authResponse({error:message,localSessionCleared:true,remoteRevocationConfirmed:false},status,clear,error.retryAfter);
  }
}
