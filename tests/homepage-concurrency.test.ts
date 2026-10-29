import {test} from 'node:test';
import assert from 'node:assert/strict';
import {homepageApi} from '../worker/homepage.js';
import {defaultHome} from '../src/features/homepage/config';

class ConditionalBucket {
  rows=new Map<string,{value:string;etag:string}>();
  sequence=0;
  reads:string[]=[];
  beforePut:((key:string,value:string)=>Promise<void>)|null=null;
  async get(key:string){
    this.reads.push(key);
    const row=this.rows.get(key);
    return row?{etag:row.etag,json:async()=>JSON.parse(row.value)}:null;
  }
  async put(key:string,value:string,options:any={}){
    await this.beforePut?.(key,value);
    const old=this.rows.get(key);
    if(options.onlyIf?.etagMatches&&old?.etag!==options.onlyIf.etagMatches)return null;
    if(options.onlyIf?.etagDoesNotMatch==='*'&&old)return null;
    const row={value,etag:String(++this.sequence)};
    this.rows.set(key,row);return row;
  }
}
function request(path:string,method='GET',body?:unknown){
  return new Request('https://zuppo.test'+path,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
const config=(name:string)=>({...structuredClone(defaultHome),announcement:name});
async function publish(db:ConditionalBucket,revision:string,publishedRevision?:string){
  return homepageApi(request('/api/admin/homepage/publish','POST',{revision,...(publishedRevision===undefined?{}:{publishedRevision})}),db,defaultHome);
}
for(const existing of [false,true])test(`older concurrent publication cannot overwrite newer content (${existing?'existing publication':'first publication'})`,async()=>{
  const db=new ConditionalBucket();
  const previous=existing?'original':'initial';
  if(existing)await db.put('content/home-published',JSON.stringify({revision:previous,config:config('Original')}));
  await db.put('content/home-draft',JSON.stringify({revision:'A',config:config('Campaign A')}));
  let release!:()=>void,ready!:()=>void;
  const gate=new Promise<void>(r=>{release=r});
  const paused=new Promise<void>(r=>{ready=r});
  db.beforePut=async(key,value)=>{
    if(key==='content/home-published'&&JSON.parse(value).revision==='A'){ready();await gate;}
  };
  const older=publish(db,'A',previous);
  await paused;
  await db.put('content/home-draft',JSON.stringify({revision:'B',config:config('Campaign B')}));
  const newer=await publish(db,'B',previous);
  assert.equal(newer.status,200);
  release();
  assert.equal((await older).status,409);
  const final=JSON.parse(db.rows.get('content/home-published')!.value);
  assert.equal(final.revision,'B');assert.equal(final.config.announcement,'Campaign B');
});
test('publication requires the expected public revision and rejects stale public or draft versions',async()=>{
  const db=new ConditionalBucket();
  await db.put('content/home-draft',JSON.stringify({revision:'draft-v1',config:config('Draft')}));
  assert.equal((await publish(db,'draft-v1')).status,409);
  assert.equal(db.rows.has('content/home-published'),false);
  await db.put('content/home-published',JSON.stringify({revision:'public-v2',config:config('Public')}));
  db.reads=[];
  assert.equal((await publish(db,'draft-v1','public-v1')).status,409);
  assert.deepEqual(db.reads,['content/home-published']);
  assert.equal((await publish(db,'draft-old','public-v2')).status,409);
  assert.equal(JSON.parse(db.rows.get('content/home-published')!.value).revision,'public-v2');
});
test('draft saving remains conditional and publication reads the public snapshot before the draft',async()=>{
  const db=new ConditionalBucket();
  const saved=await homepageApi(request('/api/admin/homepage','PUT',{revision:'initial',config:config('New')}),db,defaultHome);
  assert.equal(saved.status,200);
  const draft=await saved.json();
  const conflict=await homepageApi(request('/api/admin/homepage','PUT',{revision:'initial',config:config('Old client')}),db,defaultHome);
  assert.equal(conflict.status,409);
  db.reads=[];
  const published=await publish(db,draft.revision,'initial');
  assert.equal(published.status,200);
  assert.deepEqual(db.reads,['content/home-published','content/home-draft']);
  assert.equal(published.headers.get('Cache-Control'),'no-store');
  const view=await homepageApi(request('/api/homepage'),db,defaultHome);
  assert.equal((await view.json()).config.announcement,'New');
});
