# Zuppo — produção no Vercel

URL pública: https://zuppo-theta.vercel.app
Projeto: zuppo1/zuppo. Node.js 24.

## Arquitetura

React/Vite e APIs Node.js executam no Vercel. PostgreSQL, catálogo, permissões e autenticação continuam no Supabase. Novos uploads, banners, configurações e eventos são persistidos no armazenamento privado Vercel Blob `zuppo-storage`. Não existe proxy nem dependência de runtime do Cloudflare. Nenhuma comparação entre lojas foi incluída.

As nove ofertas disponíveis na validação vieram do banco existente, sem inserção de dados demonstrativos ou alteração dos produtos. As imagens dessas ofertas já eram URLs do Supabase Storage e foram preservadas. Configurações e banners que existiam exclusivamente no antigo R2 não foram importados; o editor da home utiliza agora Vercel Blob e começa com a configuração padrão na ausência de conteúdo salvo.

## Variáveis do projeto

- `CATALOG_PROVIDER=supabase`
- `SUPABASE_URL`: URL do projeto existente.
- `SUPABASE_PUBLISHABLE_KEY` ou `SUPABASE_ANON_KEY`: chave pública com prefixo sb_publishable_. O segundo nome é aceito para a configuração feita pelo responsável.
- `BLOB_READ_WRITE_TOKEN`: provisionado automaticamente ao conectar o armazenamento privado. Somente servidor.

Não usar service_role, VITE_* para segredos ou ZUPPO_PROXY_SECRET. A antiga chave da ponte não é necessária. Para Preview, configure também as variáveis Supabase nesse ambiente; as fornecidas pelo responsável estavam em Production.

## Build e publicação

Preset Vite, build `npm run build:vercel`, saída `dist`. O build também gera `server/vercel-runtime.mjs` com esbuild, incluindo a configuração TypeScript compartilhada. Não remova esse passo: evita importações inexistentes em produção. O arquivo gerado não precisa ser versionado.

```sh
npm ci --include=dev
npm test
vercel build --prod --yes
vercel deploy --prebuilt --prod --yes
```

Execute na raiz vinculada ao projeto correto. `vercel project inspect --non-interactive` deve identificar zuppo1/zuppo antes de publicar. A CLI Vercel deve estar instalada e autenticada. Sem build prévio, use `npm run deploy` para publicar pelo CLI. O script `deploy:cloudflare` foi mantido apenas para compatibilidade histórica, sem uso nesta instalação.

Alterações em ofertas são lidas do banco a cada consulta e não exigem deploy. O RLS permanece ativo; as operações administrativas usam o JWT do usuário autorizado. O agendamento de exclusão em 72 horas, se ativado no Supabase, independe da hospedagem; esta implantação não executou migrações nem confirmou o estado do cron.

## Verificação realizada

- 62 testes locais aprovados e build Vercel de produção concluído.
- `/healthz`: HTTP 200, missing vazio.
- `/api/offers?limit=12`: HTTP 200 e nove ofertas.
- `/api/homepage` e `/api/settings`: HTTP 200.
- Sessão administrativa sem login: HTTP 401, como esperado.
- Navegador real: ofertas e imagens, busca, favorito local, aviso de redirecionamento, página de login e celular de 390px sem rolagem horizontal ou erros JavaScript.
- Armazenamento privado: gravação/leitura/atualização e rejeição de ETag desatualizado verificadas com arquivo temporário removido ao terminar.

Não foi utilizado o login/senha do administrador nem foram editadas ofertas reais nos testes. A validação autenticada de salvar oferta e publicar banner ainda deve ser feita pelo responsável.

## Limites

O adaptador mantém as gravações condicionais do CMS de forma atômica usando ETags do Blob. Arquivos e metadados são privados; somente as rotas de mídia da aplicação entregam imagens. O teto de arquivo continua em 4MB, sujeito também ao limite multipart de aproximadamente 4,5MB da Function.

A proteção de requisições usa o endereço fornecido pela infraestrutura Vercel e o fallback limitado por instância já existente no backend. Os antigos bindings de rate limit do Cloudflare não existem no Vercel; limites globais adicionais devem ser configurados no Vercel Firewall ou em armazenamento distribuído. Eventos são limitados e deduplicados, mas não representam métricas antifraude.

O projeto tem conexão GitHub configurada. O deploy foi feito diretamente pela CLI; estes arquivos ainda precisam ser enviados ao repositório antes de depender de futuros deploys por push. Não envie `.env*`, `.vercel`, tokens, node_modules ou dados locais.
