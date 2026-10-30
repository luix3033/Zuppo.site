# Ofertas não carregam: diagnóstico e configuração

A consulta pública realizada em 29/10/2026 encontrou `/healthz` com HTTP 503 e `configuration_required`, e `/api/offers?limit=1` com HTTP 503 JSON. As rotas chegam ao Worker. Isso comprova configuração incompleta; a resposta antiga não identifica qual variável ou binding falta. A nova resposta lista os nomes ausentes, sem valores.

O frontend usa `src/lib/repository.ts` para consultar `/api/offers` na mesma origem. `worker/supabase.js` chama a API REST do Supabase com chave publishable e RLS. Não existe inicialização do Supabase no navegador, nem necessidade de `VITE_CATALOG_PROVIDER`.

## Cloudflare Workers → zuppo-site → Settings → Variables and Secrets

Configure para o ambiente de produção, no runtime:

- `CATALOG_PROVIDER`: `supabase`
- `SUPABASE_URL`: `https://ggwiulnngstbbjizhafu.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY`: a chave pública publishable do projeto correto.

Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` não são lidas por esta aplicação. Não é possível confirmar as variáveis do build remoto sem acesso ao painel/logs. O Vite não recebe automaticamente as variáveis de runtime. Esta arquitetura não depende de credenciais durante o build; não copie chaves para o bundle para corrigir o runtime.

Mantenha os bindings `BUCKET` (R2 `zuppo`) e `ASSETS`, `run_worker_first: true` e o fallback SPA no Wrangler. Build: `npm ci --include=dev && npm run build`. Deploy: `npm run deploy`. Aplique a configuração por Save/Deploy no painel. Não restaure `public/_redirects`.

## Supabase

As consultas usam `offers`, `products`, `categories`, `marketplaces`, colunas de preço em centavos e a RPC `zuppo_query_offers` criada pela migração 003. Esta versão não inclui comparação entre lojas e não exige a migração 004. Execute apenas a migração pendente apropriada; não recrie tabelas nem reexecute 001/002. Preserve RLS e grants das migrações.

Ofertas públicas exigem status active, available true, published_at preenchido e não futuro, expiração válida, categoria e marketplace ativos e imagem/link válidos. O login administrativo exige usuário em admin_memberships. Não torne o catálogo privado acessível para corrigir uma configuração ausente.

O navegador acessa a API da própria Zuppo, e o Worker chama Supabase no servidor; não é necessário liberar CORS indiscriminadamente. O CSP connect-src self é compatível com esse fluxo.

Depois de configurar, confirme `/healthz` HTTP 200 com missing vazio e `/api/offers?limit=1` HTTP 200 JSON. Se continuar falhando com health saudável, investigue migrações/permissões e a elegibilidade das ofertas. O health verifica configuração, não conectividade nem estado das migrações. Nenhuma inspeção autenticada do banco real foi feita nesta correção.

Publicar ou editar ofertas altera o banco e a próxima consulta lê os dados sem rebuild. Este ajuste não muda a interface nem os dados existentes.
