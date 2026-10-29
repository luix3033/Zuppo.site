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
function authResponse(data, status = 200, cookies = []) {
  const headers = new Headers({'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'});
  for (const value of cookies) headers.append('Set-Cookie',value);
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
  if (path === '/api/auth/logout') {
    const token = sessionCookieValue(request,sessionCookieNames(request).access);
    if (token) try {await fetcher(new URL('/auth/v1/logout?scope=local',origin),{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000)});} catch {}
    return authResponse({ok:true},200,sessionCookies(request,null));
  }
  if (!['/api/auth/login','/api/auth/refresh'].includes(path)) return authResponse({error:'Rota não encontrada.'},404);
  let payload;
  const refreshing = path.endsWith('/refresh');
  if (refreshing) {
    const refresh = sessionCookieValue(request,sessionCookieNames(request).refresh);
    if (!refresh) return authResponse({error:'Entre novamente para continuar.'},401,sessionCookies(request,null));
    payload = {refresh_token:refresh};
  } else {
    const text = await request.text();
    if (text.length > 4096) return authResponse({error:'Dados de acesso inválidos.'},400);
    const input = JSON.parse(text);
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
  if (![session.access_token,session.refresh_token].every(v => typeof v === 'string' && /^[A-Za-z0-9._~-]{1,4000}$/.test(v))) throw Error('Sessão de autenticação inválida');
  const admin = await validateAdminToken(env,session.access_token,fetcher);
  return authResponse({authenticated:true,email:admin.email,authProvider:'supabase',catalogReadOnly:false},200,sessionCookies(request,session));
}
