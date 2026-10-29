# Zuppo

Plataforma brasileira de curadoria de ofertas, com frontend React/TypeScript, APIs em Cloudflare Workers, banco e autenticação Supabase e arquivos persistidos em R2.

## Atualização de desempenho e segurança

Esta versão requer a migração SQL003 e o binding ASSETS. Consulte [ativação, configuração e limites](docs/refinamento.md) antes de publicar. O backend foi modularizado e é compilado pelo esbuild; o catálogo usa consultas paginadas no PostgreSQL.

## Desenvolvimento

Requisitos: Node.js 22.13+ e npm.

```sh
npm ci
npm run dev
```

Acesse http://127.0.0.1:5173. O servidor de desenvolvimento opera apenas em loopback e usa `.local-data/` para mídia e configurações. A autorização de desenvolvimento é definida pelo servidor, sem confiar em cabeçalhos fornecidos pelo visitante. Não exponha esse processo como servidor de produção. Para consultar o Supabase localmente, configure `.env.local` conforme `.env.example`.

```sh
npm test
npm run build
```

## Cloudflare Workers

O build gera o React em `dist/` e o Worker em `dist/server/index.js`. Copie `wrangler.hospedagem.example.jsonc` para `wrangler.jsonc` e configure o nome do Worker e o bucket R2 real. Preserve configurações já existentes da sua conta.

- Build: `npm run build`.
- Deploy: `npm run deploy`.
- Entrada do Worker: `dist/server/index.js`.
- Assets: `./dist`.
- Fallback: `assets.not_found_handling = "single-page-application"`.
- Binding de assets: `ASSETS`; todas as rotas passam pelo Worker com `assets.run_worker_first = true`.
- Binding R2: `BUCKET`.
- Variáveis de runtime: `CATALOG_PROVIDER=supabase`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.

Não usar `/* /index.html 200` em `_redirects`; essa regra causa loop na validação de assets. `public/.assetsignore` impede que o Worker compilado seja publicado como asset estático. O Vite copia os arquivos de `public/` para `dist/`.

## Catálogo e painel

O catálogo consulta o Supabase em tempo de execução. Alterações em ofertas não exigem novo deploy. A administração utiliza e-mail/senha, cookies HttpOnly, validação de identidade e vínculo em `admin_memberships`. As operações SQL respeitam RLS e salvam produto/oferta em transação. Histórico de preços é registrado por trigger. Ver [administração](docs/supabase-admin.md) e [banco](docs/supabase-primeira-etapa.md).

Ofertas públicas devem estar ativas, disponíveis, já publicadas, não expiradas, com imagem e link HTTPS válidos, categoria e loja ativas. O botão Ver oferta abre aviso de redirecionamento; `/go/:id` confere novamente a disponibilidade antes de abrir a loja.

Home, campanhas, cores, contatos e biblioteca são geridos no painel. Arquivos e configurações usam R2; preservar seus objetos ao trocar de bucket. O ZIP do código não contém dados remotos. Nunca incluir senhas, tokens, `.env.local` ou chaves administrativas no Git.

## Estrutura

- `src/`: interface, páginas, componentes, filtros e clientes HTTP.
- `worker/`: rotas, autenticação, catálogo, CMS e mídia.
- `server/`: servidor e armazenamento de desenvolvimento.
- `supabase/`: migrações e testes SQL.
- `tests/`: testes de domínio, APIs, autorização e persistência.
- `docs/`: arquitetura e configuração.

## Operação

Favoritos e tema permanecem no navegador. Métricas representam interações, não vendas ou visitantes únicos. O painel consulta até mil eventos dos últimos 30 dias e informa resultados parciais. Ainda não há importação automática de marketplaces, checkout ou distribuição por redes sociais. APIs comerciais devem ser conectadas por meios autorizados.

A interface consulta páginas limitadas e o PostgreSQL executa filtros, ordenação e contagem. Ver [consulta de ofertas](docs/supabase-leitura.md).

## Documentos legais

Privacidade e Termos descrevem as operações atuais e usam o e-mail público configurado no painel. A identificação do responsável, os contatos e os critérios de retenção devem corresponder à operação real. A revisão de conteúdo não constitui aprovação jurídica. Atualize os documentos quando houver mudanças de tratamento de dados ou integrações.
