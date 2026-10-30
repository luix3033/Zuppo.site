import {readJsonBody} from './request-security.js';
import {validImage} from './offers.js';
import {json} from './http.js';
export const defaultMascotStatus={state:'offline',revision:'initial',updatedAt:null,images:{hunting:'/images/zuppinho-procurando.png',resting:'/images/zuppinho-descansando.png',offline:'/images/zuppinho-dormindo.png'}};
export async function mascotStatusApi(request,db){
 const key='settings/mascot-status',stored=await db.get(key),current=stored?await stored.json():defaultMascotStatus;
 if(request.method==='GET')return json(current);
 if(request.method!=='PUT')return json({error:'Método não permitido.'},405);
 const input=await readJsonBody(request,8192);
 if(!input||!['hunting','resting','offline'].includes(input.state)||!input.images||!['hunting','resting','offline'].every(k=>typeof input.images[k]==='string'&&input.images[k].length<=2000&&(validImage(input.images[k])||/^\/images\/[a-zA-Z0-9_-]+\.(png|webp|jpg)$/.test(input.images[k]))))return json({error:'Confira o status e as três imagens.'},400);
 if(input.revision!==current.revision)return json({error:'O status mudou. Recarregue antes de salvar.'},409);
 const record={state:input.state,images:Object.fromEntries(['hunting','resting','offline'].map(k=>[k,input.images[k]])),revision:crypto.randomUUID(),updatedAt:new Date().toISOString()};
 const result=await db.put(key,JSON.stringify(record),{onlyIf:stored?{etagMatches:stored.etag}:{etagDoesNotMatch:'*'}});
 return result?json(record):json({error:'O status mudou. Recarregue antes de salvar.'},409);
}
