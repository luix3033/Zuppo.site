import {test} from 'node:test';import assert from 'node:assert/strict';
import {createHandler} from '../worker/index.js';
test('mascot status is public to read, admin-only to write, validated and revision protected',async()=>{
 const rows=new Map();let version=0;const bucket={get:async key=>{const row=rows.get(key);return row?{etag:row.etag,json:async()=>JSON.parse(row.value)}:null;},put:async(key,value,options)=>{const old=rows.get(key);if(options?.onlyIf?.etagMatches&&old?.etag!==options.onlyIf.etagMatches)return null;if(options?.onlyIf?.etagDoesNotMatch==='*'&&old)return null;const row={etag:String(++version),value};rows.set(key,row);return row;}};
 const handler=createHandler(),env={BUCKET:bucket,DEV_AUTH_ENABLED:true,DEV_ADMIN_EMAIL:'test@zuppo.test'};
 const call=(path,method='GET',data?,admin=false,origin='https://test.example')=>handler.fetch(new Request('https://test.example'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(admin?{'x-zuppo-dev-email':'test@zuppo.test'}:{})},...(data?{body:JSON.stringify(data)}:{})}),env);
 const initial=await(await call('/api/mascot-status')).json();assert.equal(initial.state,'offline');
 assert.equal((await call('/api/admin/mascot-status','PUT',initial)).status,403);
 assert.equal((await call('/api/admin/mascot-status','PUT',initial,true,'https://evil.example')).status,403);
 assert.equal((await call('/api/admin/mascot-status','PUT',{...initial,state:'invented'},true)).status,400);
 assert.equal((await call('/api/admin/mascot-status','PUT',{...initial,images:{...initial.images,hunting:'javascript:alert(1)'}},true)).status,400);
 const saved=await call('/api/admin/mascot-status','PUT',{...initial,state:'hunting'},true);assert.equal(saved.status,200);
 assert.equal((await(await call('/api/mascot-status')).json()).state,'hunting');
 assert.equal((await call('/api/admin/mascot-status','PUT',initial,true)).status,409);
});
