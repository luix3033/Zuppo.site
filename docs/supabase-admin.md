# Administração e autenticação

O painel em `/zuppo-admin/login` autentica por e-mail e senha usando Supabase Auth. O usuário deve ter conta confirmada e vínculo em `admin_memberships`. Cadastro e recuperação de conta são geridos no Supabase; não existe registro público de administradores.

## Sessão e permissões

O Worker valida o token em `/auth/v1/user` e confere o vínculo de administrador em cada chamada protegida. O JWT do usuário é enviado às operações SQL para que RLS permaneça efetiva. Não utilizar `service_role` para contornar políticas.

Tokens são mantidos em cookies HttpOnly, não em localStorage ou no JSON de login. Em HTTPS, os cookies usam `Secure`, prefixo `__Host-`, `Path=/`, `SameSite=None` e `Partitioned`. Login, renovação, encerramento e mutações exigem a origem correta. O navegador precisa aceitar cookies de sessão. Cookies de contextos incorporados e de acesso direto podem pertencer a partições distintas.

Uma resposta 401 permite uma tentativa de renovação; falta de permissão não é resolvida por renovar o token. Sair limpa os cookies e solicita encerramento da sessão no serviço de autenticação. Falha de revogação é informada pelo painel, mesmo com a sessão local removida. Conteúdo já aberto pode permanecer em memória, mas operações seguintes verificam a autorização.

O servidor de desenvolvimento fornece autorização interna apenas em loopback. Esse modo é explícito, não depende de variáveis de produção e não deve ser exposto à internet.

## Ofertas

A administração consulta ofertas em todos os estados. Para publicar, selecionar Publicada, manter Disponível marcado e fornecer preço positivo, imagem e link HTTPS válidos. Expiração é opcional. O catálogo só exibe registros elegíveis; `/go/:id` revalida o destino antes do redirecionamento.

`zuppo_save_offer` salva produto e oferta em transação e serializa operações do mesmo ID. O trigger registra mudanças de preço. Se uma oferta compartilhar produto com outra, a edição cria uma cópia para não alterar a outra oferta. `zuppo_delete_offer` remove o histórico relacionado e exclui o produto somente se não houver outras referências.

O editor da home preserva rascunho, prévia e publicação. Mídia e configurações permanecem no R2. A exclusão de arquivos verifica referências nas ofertas e na home publicada ou em edição.

## Validação operacional

Entrar, salvar uma oferta real como rascunho, verificar que está oculta publicamente, publicar, conferir preço e redirecionamento, alterar disponibilidade e verificar novamente. Confirmar também upload de mídia, publicação de campanhas e bloqueio de acesso sem sessão. Manter backup do banco e dos objetos R2 segundo a política operacional adotada.
