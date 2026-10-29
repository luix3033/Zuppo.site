import fs from 'node:fs/promises';
import {build} from 'esbuild';
await fs.mkdir('dist/server',{recursive:true});
await build({entryPoints:['worker/entry.ts'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,sourcemap:false,legalComments:'none'});
console.log('Worker compilado com assets separados.');
