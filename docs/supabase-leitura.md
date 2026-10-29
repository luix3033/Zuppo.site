# Etapa 2 — catálogo público no Supabase

Registro da etapa de leitura. O bloqueio administrativo descrito abaixo foi substituído pela [etapa 3: Auth e CRUD](supabase-admin.md).

## Configuração

As tabelas da migração 202610290001 devem existir e o teste SQL/RLS deve ter passado. Não há nova migração nesta etapa.

Variáveis de runtime do servidor (não `VITE_*`):

```dotenv
CATALOG_PROVIDER=supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_PUBLISHABLE_KEY=CHAVE-PUBLISHABLE-DO-PROJETO
```

Localmente use `.env.local`, ignorado pelo Git, e reinicie `npm run dev`. Em produção configure essas variáveis na hospedagem e publique o código uma vez. Atualizações posteriores dos registros não exigem builds. Não usar `service_role`, segredo administrativo ou senha. O adaptador recusa `sb_secret_*` e exige a chave publishable: todas as requisições são anônimas e sujeitas a RLS, inclusive quando o usuário do site está autenticado no ChatGPT.

## Caminho de leitura

React → API same-origin do Worker → API REST oficial do Supabase → PostgreSQL/RLS.

`worker/supabase.js` adapta o produto/loja/oferta normalizados ao contrato `Offer`. Converte centavos para reais, trata preço anterior ausente, obtém páginas PostgREST até a página vazia (sem assumir o limite configurado no projeto), valida imagem e destino novamente e preserva filtros, ordenação e paginação da API existente. Os filtros estruturados de categoria, loja e faixa de preço também são enviados ao banco. Detalhes e `/go/:id` consultam somente o ID necessário. Eventos de visualização e clique permanecem no R2, após validar a oferta no Supabase.

O navegador não recebe nenhuma chave pelo bundle. Respostas têm `Cache-Control: no-store`; falhas remotas geram 503 e o estado de erro/repetição já existente. Não há fallback automático para ofertas antigas ou fictícias quando o Supabase falha. Nova consulta/recarregamento lê o estado atualizado; não há Realtime/polling em abas abertas.

**Limite deliberado desta etapa:** o frontend ainda carrega o catálogo inteiro por páginas e faz filtros localmente. Na API, busca textual, desconto, ordenação e paginação final também usam o contrato em memória após as páginas do banco; não é ainda a consulta ideal para um catálogo grande. Não assumir capacidade validada para milhares de registros. Levar todos os filtros/contagem/paginação ao SQL e mudar o hook por consulta é uma próxima etapa específica, preservando a interface. Histórico público detalhado ainda não é consultado; o registro SQL automático continua ativo.

## Administração durante a transição

O painel e a autenticação ChatGPT não foram substituídos. A lista e os indicadores de catálogo leem as ofertas públicas do Supabase e mostram aviso de modo de leitura. Rascunhos SQL ainda não aparecem no painel. PUT/DELETE de ofertas retornam 409 para impedir falsas publicações apenas no armazenamento antigo. O servidor protege essa restrição mesmo que alguém modifique os botões no navegador.

Home, banners, contatos, upload de mídia e metadados continuam no R2. Exclusão de mídia fica protegida até a verificação de referências incluir rascunhos SQL; isso evita apagar uma imagem usada por oferta que a chave pública não pode ler. Arquivos e dados R2 não são apagados ou importados automaticamente.

Antes de usar `/media/...` em produtos no Supabase, manter a hospedagem atual que serve esse caminho. URLs HTTPS externas válidas também funcionam. A troca para Cloudflare Pages exigirá preservar o serviço de mídia.

## Verificações

- `npm test`: regressões, conversão monetária, paginação remota parcial, filtros, URL insegura, expiração, erro remoto, rotas e bloqueio de gravação antiga.
- `npm run build`: frontend e Worker compilados juntos, sem credenciais no código.
- Teste real com chave pública: tabelas públicas acessíveis; `admin_memberships` deve recusar leitura.
- Worker compilado consultado contra o Supabase real: catálogo simples e filtrado retornaram 200, ID inexistente 404 e redirecionamento inexistente 410.
- Banco inicialmente vazio: catálogo vazio é esperado. Não criar produtos falsos para preencher a tela.
- Para validar inserção/alteração/remoção de uma oferta real, é necessário cadastrar dados reais via SQL privilegiado, ou implementar o CRUD administrativo na próxima etapa com autorização. Esta etapa não dispõe de credenciais de escrita e não faz alterações remotas no banco.

Rollback: restaurar `CATALOG_PROVIDER=r2` no runtime e republicar/reiniciar conforme a hospedagem. Isso restaura a leitura antiga sem excluir registros SQL. Não usar rollback como sincronização entre catálogos.
