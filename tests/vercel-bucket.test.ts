import {test} from 'node:test';import assert from 'node:assert/strict';import {VercelBucket} from '../server/vercel-bucket.mjs';
test('private Vercel storage preserves bytes and metadata and uses atomic conditional writes',async()=>{
 const rows=new Map();let version=0;
 const sdk={get:async key=>{const row=rows.get(key);return row?{statusCode:200,stream:new Response(row.body).body,blob:{etag:'W/'+row.etag}}:null;},put:async(key,body,options)=>{
  assert.equal(options.access,'private');assert.equal(options.addRandomSuffix,false);
  const row=rows.get(key);if((options.ifMatch&&row?.etag!==options.ifMatch)||(!options.allowOverwrite&&row)){const error=new Error('conflict');error.name='BlobPreconditionFailedError';throw error;}
  const etag=String(++version);rows.set(key,{body,etag});return {etag};},del:async key=>rows.delete(key),list:async()=>({blobs:[...rows.keys()].map(pathname=>({pathname})),hasMore:false})};
 const bucket=new VercelBucket(sdk);assert.equal(await bucket.get('missing'),null);
 const first=await bucket.put('content/home','{"value":1}',{onlyIf:{etagDoesNotMatch:'*'},customMetadata:{name:'test'}});
 assert.deepEqual(await(await bucket.get('content/home')).json(),{value:1});assert.equal((await bucket.get('content/home')).etag,first.etag);
 assert.equal(await bucket.put('content/home','{}',{onlyIf:{etagDoesNotMatch:'*'}}),null);
 assert.ok(await bucket.put('content/home','{}',{onlyIf:{etagMatches:first.etag}}));
 assert.equal(await bucket.put('content/home','{}',{onlyIf:{etagMatches:first.etag}}),null);
 assert.equal((await bucket.list({prefix:'content/'})).objects.length,1);await bucket.delete('content/home');assert.equal(await bucket.get('content/home'),null);
});
