import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
test('PWA manifest uses supplied symbol, standalone mode and correctly sized separate maskable icons',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');assert.equal(manifest.id,'/');assert.ok(manifest.start_url.startsWith('/'));
 for(const icon of manifest.icons){const buffer=await readFile(new URL('../public'+icon.src,import.meta.url));const [width,height]=icon.sizes.split('x').map(Number);assert.equal(buffer.readUInt32BE(16),width);assert.equal(buffer.readUInt32BE(20),height);}
 assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));assert.ok(manifest.icons.some(icon=>icon.purpose==='any'));
});
test('service worker never caches APIs, admin, redirects or offer images; public offline navigation has a safe fallback',async()=>{
 const listeners=new Map();const added=[];const deleted=[];let skipped=0;let claimed=0;
 const cache={addAll:async files=>added.push(...files),match:async key=>key==='/offline.html'?new Response('Offline safe page'):undefined};
 const self={location:{origin:'https://zuppo.test'},clients:{claim:async()=>claimed++},skipWaiting:()=>skipped++,addEventListener:(type,handler)=>listeners.set(type,handler)};
 vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),{self,URL,Response,fetch:async()=>{throw Error('offline')},caches:{open:async()=>cache,keys:async()=>['another-app','zuppo-pwa-old'],delete:async key=>deleted.push(key)}});
 let pending;listeners.get('install')({waitUntil:p=>pending=p});await pending;assert.equal(skipped,0);assert.ok(added.includes('/offline.html'));assert.ok(!added.includes('/'));assert.ok(added.every(path=>!path.startsWith('/api')&&!path.startsWith('/zuppo-admin')));
 for(const path of ['/api/offers','/api/admin/session','/go/offer','/media/image.png','/zuppo-admin/painel','/healthz']){let intercepted=false;listeners.get('fetch')({request:{url:'https://zuppo.test'+path,method:'GET',mode:'navigate'},respondWith:()=>intercepted=true});assert.equal(intercepted,false,path);}
 let response;listeners.get('fetch')({request:{url:'https://zuppo.test/ofertas',method:'GET',mode:'navigate'},respondWith:p=>response=p});assert.equal(await(await response).text(),'Offline safe page');
 listeners.get('message')({data:{type:'SKIP_WAITING'}});assert.equal(skipped,1);listeners.get('activate')({waitUntil:p=>pending=p});await pending;assert.deepEqual(deleted,['zuppo-pwa-old']);assert.equal(claimed,1);
});
