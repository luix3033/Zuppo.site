import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {PrivacyPage,TermsPage} from '../src/pages/InfoPages';
import {createHandler} from '../worker/index.js';
test('legal pages render operational disclosures and contact links without obsolete draft notices',()=>{
 for(const Page of [PrivacyPage,TermsPage]){
  const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(Page)));
  assert.match(html,/href="\/contato"/);assert.doesNotMatch(html,/RASCUNHO PARA|DraftNotice|revisão jurídica|esta versão/i);
 }
 const privacy=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(PrivacyPage)));
 assert.match(privacy,/Cloudflare/);assert.match(privacy,/Supabase/);assert.match(privacy,/LGPD/);
});
test('development identity is disabled unless explicitly enabled by the local server',async()=>{
 const handler=createHandler({});
 const request=()=>new Request('https://zuppo.example/api/admin/offers',{headers:{'x-zuppo-dev-email':'local@zuppo.test'}});
 const env={DEV_ADMIN_EMAIL:'local@zuppo.test',BUCKET:{list:async()=>({objects:[]})}};
 assert.equal((await handler.fetch(request(),env)).status,403);
 assert.equal((await handler.fetch(request(),{...env,DEV_AUTH_ENABLED:'true'})).status,403);
 assert.equal((await handler.fetch(request(),{...env,DEV_AUTH_ENABLED:true})).status,200);
});
