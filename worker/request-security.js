import {clientAddress} from './client-address.js';
/** Erros de entrada e contenção com mensagens próprias para a resposta pública. */
export class RequestSecurityError extends Error {
  constructor(message, status = 400, retryAfter) {
    super(message);
    this.status = status;
    if (retryAfter) this.retryAfter = retryAfter;
  }
}

export async function readBodyBytes(request, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw Error('Limite de leitura inválido');
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)))) throw new RequestSecurityError('Tamanho da solicitação inválido.');
  if (length !== null && Number(length) > maxBytes) throw new RequestSecurityError('Solicitação acima do tamanho permitido.', 413);
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new RequestSecurityError('Solicitação acima do tamanho permitido.', 413);
      }
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {bytes.set(chunk, offset);offset += chunk.byteLength;}
  return bytes;
}

export async function readJsonBody(request, maxBytes = 65536) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new RequestSecurityError('Envie os dados em formato JSON.', 415);
  const bytes = await readBodyBytes(request, maxBytes);
  try {return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));}
  catch {throw new RequestSecurityError('O corpo da solicitação deve ser um JSON válido.');}
}

export async function readMultipartBody(request, maxBytes = 5 * 1024 * 1024) {
  const contentType = request.headers.get('content-type') || '';
  if (!/^multipart\/form-data\s*;/i.test(contentType) || !/boundary=/i.test(contentType)) throw new RequestSecurityError('Envie um formulário de upload válido.', 415);
  const bytes = await readBodyBytes(request, maxBytes);
  try {return await new Response(bytes, {headers: {'Content-Type': contentType}}).formData();}
  catch {throw new RequestSecurityError('Não foi possível ler o formulário de upload.');}
}

// Contenção de contingência por isolate; não substitui regras globais na borda.
const localRateWindows = new Map();
const maximumRateKeys = 4096;
export async function enforceRateLimit(request, env, {binding = 'AUTH_RATE_LIMITER', keyPrefix = 'request', limit = 30, windowMs = 60000} = {}) {
  const address = await clientAddress(request,env);
  const scope = new URL(request.url).hostname + ':' + keyPrefix + ':' + address;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(scope));
  const key = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const retryAfter = Math.max(1, Math.ceil(windowMs / 1000));
  const limiter = env?.[binding];
  if (limiter) {
    let result;
    try {result = await limiter.limit({key});}
    catch {throw new RequestSecurityError('A proteção de acesso está temporariamente indisponível.', 503);}
    if (!result || typeof result.success !== 'boolean') throw new RequestSecurityError('A proteção de acesso está temporariamente indisponível.', 503);
    if (!result.success) throw new RequestSecurityError('Muitas solicitações. Aguarde antes de tentar novamente.', 429, retryAfter);
    return {source: 'binding'};
  }
  const now = Date.now();
  const previous = localRateWindows.get(key);
  if (previous && previous.expiresAt > now) {
    if (previous.count >= limit) throw new RequestSecurityError('Muitas solicitações. Aguarde antes de tentar novamente.', 429, Math.max(1, Math.ceil((previous.expiresAt - now) / 1000)));
    previous.count += 1;
  } else {
    if (localRateWindows.size >= maximumRateKeys) {
      for (const [id, entry] of localRateWindows) if (entry.expiresAt <= now) localRateWindows.delete(id);
      if (localRateWindows.size >= maximumRateKeys) localRateWindows.delete(localRateWindows.keys().next().value);
    }
    localRateWindows.set(key, {count: 1, expiresAt: now + windowMs});
  }
  return {source: 'isolate'};
}
