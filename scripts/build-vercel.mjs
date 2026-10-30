import {build} from 'esbuild';
await build({entryPoints:['server/vercel-entry.mjs'],outfile:'server/vercel-runtime.mjs',bundle:true,platform:'node',target:'node24',format:'esm',packages:'external',sourcemap:false});
console.log('Vercel backend bundled with shared configuration.');
