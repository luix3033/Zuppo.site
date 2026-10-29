import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let configPath=['wrangler.jsonc','wrangler.json','wrangler.toml'].map(name=>path.join(root,name)).find(p=>fs.existsSync(p));
if(!fs.existsSync(path.join(root,'dist/server/index.js'))){console.error('Execute npm run build antes do deploy.');process.exit(1);}
if(!configPath){
  const bucket=process.env.R2_BUCKET_NAME;
  if(!bucket||!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)){
    console.error('Configure R2_BUCKET_NAME no ambiente de build/deploy ou crie wrangler.jsonc a partir do exemplo com seu bucket real.');process.exit(1);
  }
  const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.hospedagem.example.jsonc'),'utf8'));
  const name=process.env.ZUPPO_WORKER_NAME||'zuppo-site';
  if(!/^[a-z0-9][a-z0-9-]{0,62}$/.test(name)){console.error('ZUPPO_WORKER_NAME inválido.');process.exit(1);}
  config.name=name;config.main=path.join(root,'dist/server/index.js');config.assets.directory=path.join(root,'dist');config.r2_buckets[0].bucket_name=bucket;
  const folder=path.join(root,'.wrangler');fs.mkdirSync(folder,{recursive:true});
  configPath=path.join(folder,'zuppo-deploy.json');fs.writeFileSync(configPath,JSON.stringify(config,null,2));
}
const cli=path.join(root,'node_modules/wrangler/bin/wrangler.js');
const result=spawnSync(process.execPath,[cli,'deploy','--config',configPath,...process.argv.slice(2)],{cwd:root,stdio:'inherit',env:process.env});
if(result.error){console.error('Não foi possível executar o Wrangler. Instale as dependências com npm ci.');process.exit(1);}
process.exit(result.status??1);
