# Etapa 3 — autenticação e gerenciamento de ofertas

## Aplicação no Supabase

Depois de aplicar a migração inicial, executar uma vez `supabase/migrations/202610290002_admin_catalog.sql` no SQL Editor. O proprietário confirmou aplicação nesta etapa. A migração concede execução das funções somente a `authenticated`; cada função verifica `is_zuppo_admin()` e executa com as políticas RLS do usuário. Não utiliza `service_role`.

O usuário deve existir em Authentication → Users, ter e-mail confirmado e senha configurada, e estar em `admin_memberships`. Manter cadastro público desativado. Para redefinir a senha use os recursos administrativos do Supabase; esta etapa não adiciona fluxo público de recuperação ou criação de contas.

Não são necessárias novas variáveis: `CATALOG_PROVIDER=supabase`, `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` continuam no runtime. `ADMIN_EMAIL` só participa do provedor legado R2; não autoriza o catálogo Supabase.

## Login

Acessar `/zuppo-admin/login` e usar o e-mail e a senha cadastrados no Supabase. O servidor encaminha a autenticação à API oficial e confere o usuário em `/auth/v1/user` e o vínculo em `admin_memberships`. O mesmo controle ocorre em toda rota administrativa, inclusive banners, mídia e configurações.

Tokens não são devolvidos no JSON nem armazenados em localStorage. Cookies de sessão HTTPS usam prefixo `__Host-`, `HttpOnly`, `Secure`, `Path=/`, `SameSite=None` e `Partitioned` para atender também ao site incorporado. São cookies do host, sem `Domain`. Mutações e login/refresh/logout exigem `Origin` igual ao site. O navegador deve aceitar esses cookies; cookies particionados de um iframe e do acesso direto são contextos separados. Em localhost HTTP, cookies sem prefixo seguro usam `SameSite=Lax`; não expor o servidor de desenvolvimento.

O acesso dura até uma hora. Um refresh token em cookie protegido permite renovação sob demanda por até sete dias, com rotação do Supabase. Uma resposta 401 tenta renovar uma vez; 403 não renova permissões revogadas. Sair limpa ambos os cookies e solicita encerramento da sessão local no Supabase. Abas com conteúdo já aberto podem manter a tela em memória, mas a próxima operação verifica a autorização novamente. Não há cache de permissões.

A proteção externa de acesso do Sites continua independente: esta etapa não publica o site para visitantes nem altera seu compartilhamento.

## Ofertas

A lista administrativa inclui rascunhos, publicadas, desativadas e expiradas. O formulário existente continua a controlar imagem, loja, categoria, link HTTPS, preços, destaque e seleção relâmpago. Para desativar, desmarcar Disponível ou alterar o status e salvar.

`PUT /api/admin/offers/:id` valida o contrato e envia o JWT do usuário para `rpc/zuppo_save_offer`. A função grava produto e oferta em uma única transação; falhas desfazem ambas as alterações. Preços são convertidos para centavos inteiros. A data de publicação é atribuída ao publicar pela primeira vez. O trigger existente registra mudanças de preço. IDs são serializados por trava transacional para evitar duplicação em cadastros concorrentes.

Se um produto estiver compartilhado entre ofertas, a edição gera uma cópia para não mudar outras ofertas. `DELETE` chama `zuppo_delete_offer`, remove o histórico por cascade e remove o produto somente quando não estiver referenciado por outras ofertas. Não há escrita paralela do catálogo no R2.

CMS, arquivos e eventos continuam no R2. A exclusão de imagens volta a verificar referências usando todas as ofertas acessíveis ao administrador, inclusive rascunhos SQL, além de home publicada e rascunho de home.

## Testes

`npm test` inclui testes HTTP de autenticação, cookies, renovação, encerramento, origem inválida, conta sem permissão, token expirado, encaminhamento de JWT, conversão de centavos e ausência de escrita no catálogo legado. Também executa ambas as migrações e os testes SQL em PostgreSQL via PGlite (dependência exclusiva de desenvolvimento), com `auth.uid` simulado para trocar papéis; o serviço Supabase Auth real não é emulado por esse teste SQL.

`supabase/tests/admin_catalog.sql` permite repetir os testes transacionais no SQL Editor. Cria registros temporários, testa falha de FK sem produto órfão, publicação, preço/histórico, desativação, exclusão e bloqueio a visitantes/usuários comuns, depois faz ROLLBACK. Se houver erro, executar ROLLBACK antes de repetir.

As duas funções RPC foram verificadas no projeto remoto: ambas existem e recusam execução anônima com erro 42501, sem alteração de registros.

Validação final com o usuário: entrar com a conta vinculada, criar uma oferta real como rascunho, conferir que não aparece publicamente, publicar, recarregar o catálogo, alterar preço/disponibilidade e conferir. Não enviar a senha ao desenvolvedor. Sem a sessão do proprietário não é possível testar seu login real ou executar gravações no projeto remoto; testes locais não substituem essa confirmação.

O catálogo público continua com os limites de consulta documentados em `supabase-leitura.md`. Esta etapa não adiciona APIs comerciais, automações, checkout, novo CMS ou deploy Cloudflare/GitHub independente.
