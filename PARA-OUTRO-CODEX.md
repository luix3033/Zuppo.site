# Zuppo — transferência para outro workspace do Codex

Snapshot do commit local 8bba657, branch deploy/vercel.
Produção: https://zuppo-theta.vercel.app
Repositório de destino: https://github.com/luix3033/Zuppo.site
Este snapshot foi publicado diretamente pelo CLI; o GitHub pode conter versão antiga.

## Começar

Extraia o projeto em uma pasta de trabalho. Use Node.js 24.
Execute npm ci --include=dev, npm test e npm run build:vercel.
Para desenvolvimento: npm run dev (loopback; dados locais).
Leia README.md, docs/VERCEL.md, docs/PWA.md e docs/STATUS-ZUPPINHO.md.

## Arquitetura atual

Frontend React + TypeScript + Vite. Produção Vercel, com api/index.mjs encaminhando para o backend empacotado em server/vercel-runtime.mjs. Esse arquivo é gerado no build a partir de server/vercel-entry.mjs; não precisa ser enviado nem versionado.
As rotas compartilhadas ficam em worker/, mas são executadas como APIs Node.js no Vercel, sem dependência de runtime do Cloudflare.
Catálogo, autenticação e RLS: Supabase. Arquivos, configurações, home e status: Vercel Blob privado. Não use filesystem local como persistência de produção.

Variáveis runtime: CATALOG_PROVIDER=supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY ou SUPABASE_ANON_KEY (chave pública sb_publishable_), BLOB_READ_WRITE_TOKEN (privado, somente servidor). Credenciais não estão neste pacote. Configure-as separadamente pelo ambiente seguro do novo workspace ou pela conta Vercel autorizada.
Não reutilize tokens publicados no histórico da conversa. Não envie .env, .vercel ou credenciais para GitHub.

## Banco e automação

Não reexecute migrações 001/002 em um banco existente nem recrie tabelas. Confira quais migrações já foram aplicadas. A execução manual da migração 202610300006_categories.sql foi solicitada ao responsável; o resultado ainda não foi confirmado neste workspace. Ela adiciona seis categorias sem alterar ofertas existentes.
A exclusão após 72 horas depende da migração 005 e do agendamento pg_cron fornecido em supabase/operations/. Não presuma que o cron está ativo sem consultar o banco.

Para criar o bot, primeiro analise worker/supabase.js, worker/supabase-admin.js, worker/admin-auth.js, worker/admin-offers.js e as migrações. O catálogo é dinâmico; inserir/editar uma oferta não exige alteração de código ou deploy.
A API administrativa atual exige autenticação e permissão de administrador, com proteção de origem e sessão. A chave pública sozinha NÃO autoriza gravação. Ainda não há uma credencial de máquina específica para o bot: projete uma integração autorizada com escopo mínimo, sem desativar RLS nem expor service_role. Não suponha que os dois workspaces compartilham contas ou sessões.

Preserve layout, PWA, favoritos, mascotes, status, painel e presets. A campanha Ocarina é opcional, aplicada ao rascunho pelo painel; não restrinja o catálogo. A home mostra seis categorias principais; o catálogo possui dezesseis.

## GitHub e publicação

Trabalhe em branch própria e revise o diff antes de integrar. Antes de qualquer deploy, confirme o projeto Vercel correto: zuppo1/zuppo.
Arquivos antigos de Cloudflare foram mantidos como referência histórica, mas não são o destino de produção atual. Não restaure public/_redirects.
Este ZIP não contém Git, node_modules, dist, dados locais, arquivos .env reais, tokens OAuth ou arquivos de vínculo Vercel.
