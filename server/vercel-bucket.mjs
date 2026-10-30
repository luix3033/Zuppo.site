import * as blob from '@vercel/blob';
/** Private persistent object store with atomic ETag writes for the existing CMS. */
export class VercelBucket {
 constructor(sdk=blob){this.sdk=sdk;}
 async get(key){
  const object=await this.sdk.get(key,{access:'private',useCache:false});
  if(!object)return null;
  if(object.statusCode!==200)throw Error('Storage read failed');
  const record=await new Response(object.stream).json(),bytes=Buffer.from(record.bytes,'base64');
  return {key,etag:object.blob.etag.replace(/^W\//,''),size:bytes.length,uploaded:new Date(record.uploaded),httpMetadata:record.httpMetadata,customMetadata:record.customMetadata,body:bytes,json:async()=>JSON.parse(bytes.toString())};
 }
 async put(key,value,options={}){
  const bytes=typeof value==='string'?Buffer.from(value):value instanceof ReadableStream?Buffer.from(await new Response(value).arrayBuffer()):Buffer.from(value);
  const record={bytes:bytes.toString('base64'),uploaded:new Date().toISOString(),httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{}};
  try{
   const result=await this.sdk.put(key,JSON.stringify(record),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:options.onlyIf?.etagDoesNotMatch!=='*',...(options.onlyIf?.etagMatches?{ifMatch:options.onlyIf.etagMatches}:{}),cacheControlMaxAge:0});
   return {etag:result.etag};
  }catch(error){if(options.onlyIf&&(error instanceof blob.BlobPreconditionFailedError||error.name==='BlobPreconditionFailedError'||/already exists/i.test(error.message)))return null;throw error;}
 }
 async delete(key){await this.sdk.del(key);}
 async list({prefix='',cursor,limit=1000,startAfter=''}){
  const page=await this.sdk.list({prefix,cursor,limit});
  const objects=(await Promise.all(page.blobs.filter(item=>item.pathname>startAfter).map(async item=>{const object=await this.get(item.pathname);return object?{key:item.pathname,etag:object.etag,size:object.size,uploaded:object.uploaded,httpMetadata:object.httpMetadata,customMetadata:object.customMetadata}:null;}))).filter(Boolean);
  return {objects,truncated:page.hasMore,cursor:page.cursor};
 }
}
