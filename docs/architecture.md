# Arquitetura

React → APIs do Cloudflare Worker → Supabase (catálogo e autorização) / R2 (CMS, mídia e eventos).

O build gera os arquivos públicos e um Worker ESM separado dos assets. A configuração Wrangler encaminha todas as rotas ao Worker, que protege as respostas, resolve APIs e delega os arquivos/SPA ao binding ASSETS. Nenhum dado depende do filesystem de produção.

- `worker/index.js`: rotas e composição.
- `worker/admin-auth.js`: login, renovação, encerramento e verificação de administrador.
- `worker/supabase.js`: consulta pública sujeita a RLS.
- `worker/supabase-admin.js`: consultas e RPCs administrativas com o JWT do usuário.
- `worker/home-validation.js`: validação de campanhas, links e cores.
- `worker/media.js`: biblioteca e proteção de referências.
- `server/dev.mjs`: HTTP/Vite em loopback; não é um servidor de produção.

O R2 armazena `settings/site`, `content/home-draft`, `content/home-published`, `media/:id` e `events/:timestamp/:id`. Registros antigos de catálogo podem permanecer em `offers/:id`, mas não são a fonte pública quando Supabase está habilitado.

Migrações SQL versionadas criam catálogo, histórico e permissões. Salvamentos e exclusões são transacionais, sem credenciais administrativas no navegador. O modo de desenvolvimento exige um sinalizador interno e nunca é habilitado por padrão no Worker.

O editor da home usa revisão e escrita condicional para evitar sobrescrita. Exclusão de mídia verifica referências na home e nas ofertas, inclusive rascunhos acessíveis ao administrador.

Filtros, contagem e paginação pública já são executados no PostgreSQL pela RPC003. Métricas precisam de agregação e política operacional de retenção. Integrações comerciais devem ter idempotência, limites e auditoria.

Módulos adicionais: http (respostas e headers), request-security (entrada e contenção), homepage (revisões/CAS), tracking (métricas), image-validation (estrutura/dimensões) e admin-offers (operações administrativas). Ver [configuração e limites](refinamento.md).
