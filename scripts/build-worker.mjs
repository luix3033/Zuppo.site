import fs from 'node:fs';
import path from 'node:path';
import {defaultHome} from '../src/features/homepage/config.ts';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf'};
const assets={};
function walk(dir){
  for(const f of fs.readdirSync(dir,{withFileTypes:true})){
    if(f.name==='server'||f.name==='.openai')continue;
    const p=path.join(dir,f.name);
    if(f.isDirectory())walk(p);
    else assets['/'+path.relative('dist',p)]={data:fs.readFileSync(p).toString('base64'),type:types[path.extname(p)]||'application/octet-stream'};
  }
}
walk('dist');
const modules=['offers','settings','supabase','admin-auth','supabase-admin','media','home-validation','index'];
const server=modules.map(name=>fs.readFileSync('worker/'+name+'.js','utf8')
  .replace(/^import .*;\n/gm,'').replace(/\bexport (?=(?:async )?function|class|const)/g,'')).join('\n');
fs.mkdirSync('dist/server',{recursive:true});
fs.mkdirSync('dist/.openai',{recursive:true});
fs.writeFileSync('dist/server/index.js',server+'\nexport default createHandler('+JSON.stringify(assets)+',[],'+JSON.stringify(defaultHome)+');');
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
