# Arquitetura atual

React → APIs same-origin do Worker → Supabase (catálogo público, quando habilitado) / R2 (CMS, mídia e eventos). Veja [detalhes e limites da conexão](supabase-leitura.md). O adaptador local implementa as mesmas operações de armazenamento no filesystem. `npm run dev` sobe backend e frontend juntos, com persistência entre reinícios.

- `worker/offers.js`: leitura paginada dos objetos, consulta, publicação e validação de destinos.
- `worker/settings.js`: canais e contatos reais; compatibilidade de leitura dos canais da home anterior.
- `worker/media.js`: biblioteca com cursor, metadados e proteção de referências.
- `worker/index.js`: autorização por identidade hospedada, origem das mutações, rotas e composição.
- `worker/home-validation.js`: conteúdo estruturado, imagens, campanhas e contraste.

Os registros ficam em `offers/:id`, `settings/site`, `content/home-draft`, `content/home-published`, `media/:id` e `events/:timestamp/:id`. Produtos demonstrativos não são carregados no runtime. Fixtures de teste são exclusivas de `tests/fixtures/`.

A publicação de ofertas exige imagem e destino válidos. O catálogo e `/go/:id` reavaliam expiração, disponibilidade e status. Cada alteração de preço gera um histórico administrativo. Dados de preço não são apresentados como monitoramento de loja.

Antes de crescer o volume, migrar registros e consultas para D1/PostgreSQL com índices de status, categoria, loja, preço e publicação. Manter mídia em R2. Adicionar índices/agregações de métricas e uma política de retenção. A migração deve importar apenas os registros reais, com backup, validação e reconciliação de contagens, sem modificar o contrato HTTP.

Integrações comerciais são serviços separados, com APIs oficiais, idempotência, limites de requisição e auditoria. Segredos ficam no backend. Não existem conectores comerciais falsos ou automações ativas nesta versão.

## Autenticação Supabase ativa

Com o provedor Supabase, o painel autentica por e-mail/senha com cookies HttpOnly, verifica identidade e vínculo de administrador em cada chamada e encaminha o JWT às operações SQL sujeitas a RLS. Gravação/exclusão usam RPCs transacionais, sem catálogo paralelo em R2. Ver [documentação da etapa 3](supabase-admin.md).
