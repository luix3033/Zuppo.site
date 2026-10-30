import {test} from 'node:test';import assert from 'node:assert/strict';import {clientAddress} from '../worker/client-address.js';
test('proxy client identity requires the shared secret and ignores spoofed headers',async()=>{
 const request=(token)=>new Request('https://site.test/api/offers',{headers:{'cf-connecting-ip':'192.0.2.1','x-zuppo-client-ip':'192.0.2.2','x-zuppo-proxy-secret':token}});
 const secret='a'.repeat(64);assert.equal(await clientAddress(request('invalid'),{ZUPPO_PROXY_SECRET:secret}),'192.0.2.1');assert.equal(await clientAddress(request(secret),{ZUPPO_PROXY_SECRET:secret}),'192.0.2.2');assert.equal(await clientAddress(request(secret),{}),'192.0.2.1');
});
