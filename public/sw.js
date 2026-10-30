const PREFIX='zuppo-pwa-';
const CACHE=PREFIX+'__ZUPPO_BUILD__';
const FILES=['/offline.html','/offline-retry.js','/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable-512.png','/icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(/^\/(api|go|media|zuppo-admin)(\/|$)/.test(url.pathname)||url.pathname==='/healthz')return;
 if(FILES.includes(url.pathname)){event.respondWith(caches.open(CACHE).then(async cache=>await cache.match(url.pathname)||fetch(request)));return;}
 if(request.mode==='navigate')event.respondWith(fetch(request).catch(async()=>{const cached=await(await caches.open(CACHE)).match('/offline.html');return cached||new Response('Sem conexão. Tente novamente.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}));
});
