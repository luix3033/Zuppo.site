export function json(data,status=200,headers={}){
  return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
}
const contentSecurityPolicy=[
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:", "font-src 'self' data:", "connect-src 'self'",
  "frame-src 'self'", "frame-ancestors 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'",
].join('; ');
export function secureResponse(response,request){
  const headers=new Headers(response.headers);
  headers.set('Content-Security-Policy',contentSecurityPolicy);
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('X-Frame-Options','SAMEORIGIN');
  if(!headers.has('Referrer-Policy'))headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  if(new URL(request.url).protocol==='https:')headers.set('Strict-Transport-Security','max-age=31536000');
  if(new URL(request.url).pathname.startsWith('/zuppo-admin'))headers.set('X-Robots-Tag','noindex,nofollow');
  // Clonar Headers preserva múltiplos Set-Cookie no runtime Workers e Node moderno.
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export function publicFailure(error){
  if(error?.status&&[400,401,403,409,413,415,429,503].includes(error.status))return json({error:error.message,...(['CATALOG_QUERY_NOT_CONFIGURED','CATALOG_UNAVAILABLE'].includes(error.code)?{code:error.code}:{})},error.status,error.status===429?{'Retry-After':String(error.retryAfter||60)}:{});
  if(error instanceof SyntaxError)return json({error:'O corpo da solicitação deve ser um JSON válido.'},400);
  if(error instanceof URIError)return json({error:'Endereço inválido.'},400);
  return json({error:'Não foi possível concluir. Tente novamente.'},503);
}
