# Supabase — etapa 1: esquema e permissões

Status: preparação local. Não aplicado em serviço remoto. Site, painel, autenticação atual, arquivos R2 e deploy permanecem em funcionamento com a arquitetura existente.

## Configuração manual

1. Criar um projeto Supabase Free, escolher a região e guardar a senha do banco em um gerenciador seguro.
2. Copiar a URL em Settings → API / Data API (`https://<referencia>.supabase.co`). A chave publishable já fornecida não permite descobrir essa URL nem criar tabelas.
3. Em Authentication, desativar novos cadastros públicos e criar/convidar o usuário administrador. Guardar seu UUID. Configurar URL do site e URLs de retorno quando conectarmos o login; não trocar a autenticação atual nesta etapa.
4. Após revisão e autorização da aplicação remota, executar `supabase/migrations/202610290001_catalog.sql` pelo SQL Editor com a função privilegiada do projeto, ou usar `supabase db push` com o projeto vinculado. Não executar duas vezes: é uma migração versionada, transacional, sem `IF NOT EXISTS` que esconda divergências.
5. Cadastrar o administrador pelo SQL Editor (substituir o UUID):

```sql
insert into public.admin_memberships(user_id)
values ('UUID-DO-USUARIO-EM-AUTHENTICATION');
```

Não colocar senha do banco, `service_role` ou `sb_secret_...` no frontend, Git ou conversa. Nenhuma chave foi gravada nestes arquivos. A chave publishable não é uma credencial administrativa e não substitui Auth/RLS.

## Modelo

- `categories` e `marketplaces`: slugs atuais preservados, nomes e ativação; únicos dados iniciais.
- `products`: identidade do produto, categoria, imagem e especificações.
- `offers`: produto, loja, valores em centavos, link, status, disponibilidade, origem e datas.
- `offer_price_history`: histórico gerado por trigger; sem edição pela API.
- `admin_memberships`: vínculo com `auth.users`, sem cadastro/edição pela API.

O vínculo produto-oferta permite futuramente o mesmo produto em várias lojas. `Offer.currentPrice` será convertido de centavos para reais na camada de adaptação; o frontend continuará recebendo seu contrato atual. `isDemo` será sempre falso para registros reais. Exclusão de oferta remove seu histórico; produto referenciado não pode ser excluído. Para preservar registros, preferir desativar ou expirar ofertas.

RLS habilitada em todas as tabelas: visitantes só leem ofertas ativas, disponíveis, já publicadas, não expiradas, com produto visível e categoria/loja ativas. Produtos sem ofertas públicas ficam ocultos. Autenticados comuns não podem alterar o catálogo nem se promover. Administradores podem gerir o catálogo, mas não alterar a lista de administradores ou o histórico diretamente. Funções privilegiadas têm `search_path` fixo e permissões explícitas.

## Testes desta etapa

`supabase/tests/catalog_rls.sql` é um teste transacional para um projeto de testes Supabase: cria identidades e registros temporários, troca para os papéis `anon` e `authenticated`, verifica rascunhos/expiração, bloqueio de edição, autopromoção e histórico; finaliza com ROLLBACK. Se houver erro, executar ROLLBACK antes de repetir. Não contém produtos de demonstração permanentes.

A execução remota deste teste ainda está pendente. Testes existentes de Node verificam a aplicação atual, não provam o funcionamento do SQL/RLS.

## Próxima etapa, mediante nova autorização

Conectar o backend ao Supabase mantendo `/api/offers`, `/api/admin/offers` e `/go/:id`. Implementar consultas paginadas/indexadas, conversão do contrato e gravação transacional de produto/oferta. Depois conectar Supabase Auth no painel, validando JWT no servidor e encaminhando a identidade às operações sujeitas a RLS. Nunca usar a chave publishable como prova de administração.

A validação de imagem, link HTTPS, loja de destino, publicação e demais regras existentes deve ser mantida na API. RLS protege autorização e visibilidade; não substitui toda validação de negócio. Imagens e CMS continuam no R2 inicialmente. Não migrar produção parcialmente nem escrever catálogo em dois bancos sem uma estratégia explícita.

Mudanças no banco serão lidas em tempo de execução sem rebuild. Atualização de abas já abertas e invalidação de cache serão definidas na etapa de conexão. Configuração Cloudflare/GitHub e automações ficam para etapas posteriores.
