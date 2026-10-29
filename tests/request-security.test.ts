import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readBodyBytes,readJsonBody,readMultipartBody,enforceRateLimit} from '../worker/request-security.js';
import {validateImage} from '../worker/image-validation.js';
import {validPng} from './fixtures/image';
import {readFile} from 'node:fs/promises';

test('stream limits stop input before full buffering, even without Content-Length',async()=>{
 let sent=0,cancelled=false;
 const body=new ReadableStream({pull(controller){sent++;controller.enqueue(new Uint8Array(8));},cancel(){cancelled=true;}});
 const req=new Request('https://test.local/api/auth/login',{method:'POST',body,duplex:'half'});
 await assert.rejects(readBodyBytes(req,10),e=>e.status===413);
 assert.equal(cancelled,true);assert.ok(sent<5);
 const oversized=new Request('https://test.local',{method:'POST',body:'{}',headers:{'Content-Length':'1000'}});
 await assert.rejects(readBodyBytes(oversized,10),e=>e.status===413);
});
test('JSON parsing validates content type, byte budget and malformed UTF-8',async()=>{
 const req=(body,contentType='application/json')=>new Request('https://test.local',{method:'POST',body,headers:{'Content-Type':contentType}});
 assert.deepEqual(await readJsonBody(req('{"a":1}'),20),{a:1});
 await assert.rejects(readJsonBody(req('{}','text/plain')),e=>e.status===415);
 await assert.rejects(readJsonBody(req('{')),e=>e.status===400);
 await assert.rejects(readJsonBody(req(new Uint8Array([0xff]))),e=>e.status===400);
 await assert.rejects(readJsonBody(req('"ááá"'),5),e=>e.status===413);
});
test('multipart parser imposes a streamed total budget before parsing the form',async()=>{
 const form=new FormData();form.set('file',new File([validPng],'real.png',{type:'image/png'}));
 const encoded=new Request('https://test.local',{method:'POST',body:form});
 const contentType=encoded.headers.get('Content-Type');const bytes=await encoded.arrayBuffer();
 const request=()=>new Request('https://test.local',{method:'POST',headers:{'Content-Type':contentType},body:bytes});
 const parsed=await readMultipartBody(request(),4096);assert.equal(parsed.get('file').size,validPng.length);
 await assert.rejects(readMultipartBody(request(),32),e=>e.status===413);
 await assert.rejects(readMultipartBody(new Request('https://test.local',{method:'POST',body:'{}'})),e=>e.status===415);
});
test('rate limiter hashes client identity and applies binding or bounded isolate fallback',async()=>{
 const calls=[];
 const req=new Request('https://test.local/api/auth/login',{headers:{'CF-Connecting-IP':'203.0.113.10'}});
 assert.equal((await enforceRateLimit(req,{AUTH_RATE_LIMITER:{limit:async p=>{calls.push(p);return {success:true};}}})).source,'binding');
 assert.match(calls[0].key,/^[a-f0-9]{64}$/);assert.ok(!calls[0].key.includes('203.0.113.10'));
 await assert.rejects(enforceRateLimit(req,{AUTH_RATE_LIMITER:{limit:async()=>({success:false})}}),e=>e.status===429&&e.retryAfter>0);
 await assert.rejects(enforceRateLimit(req,{AUTH_RATE_LIMITER:{limit:async()=>{throw Error('offline');}}}),e=>e.status===503);
 const opts={keyPrefix:'isolated-test-'+crypto.randomUUID(),limit:2};
 await enforceRateLimit(req,{},opts);await enforceRateLimit(req,{},opts);
 await assert.rejects(enforceRateLimit(req,{},opts),e=>e.status===429);
});
test('image validation requires real structure and detects CRC corruption and truncated files',()=>{
 assert.deepEqual(validateImage(validPng),{width:1,height:1,extension:'png',contentType:'image/png'});
 for(const bytes of [new Uint8Array([137,80,78,71]),validPng.slice(0,-1),new Uint8Array([255,216,255]),new TextEncoder().encode('<svg onload="alert(1)"/>')])assert.throws(()=>validateImage(bytes),e=>e.status===400);
 const bad=validPng.slice();bad[bad.length-1]^=1;assert.throws(()=>validateImage(bad),e=>e.status===400);
 assert.throws(()=>validateImage(new Uint8Array(4*1024*1024+1)),e=>e.status===413);
});
test('image validator accepts representative existing JPEG and WebP catalog assets',async()=>{
 for(const file of ['public/images/baby-bottle.jpg','public/images/pet-bowl.jpg','public/images/headphones.webp','public/images/football.webp','public/images/controller.png']){
  const data=await readFile(new URL('../'+file,import.meta.url));const image=validateImage(data);assert.ok(image.width>0&&image.height>0,file);
 }
});
