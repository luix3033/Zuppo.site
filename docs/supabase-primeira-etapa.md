# Banco de dados e permissões

As migrações em `supabase/migrations/` definem o esquema e as operações de catálogo. Aplicar em ordem pelo SQL Editor ou pelo fluxo de migrações da sua infraestrutura. Não executar novamente uma migração já aplicada.

## Modelo

- `categories`: categorias e ativação.
- `marketplaces`: lojas e ativação.
- `products`: identidade, descrição, categoria, imagem e especificações.
- `offers`: produto/loja, preços em centavos, destino, status e datas.
- `offer_price_history`: registros automáticos de mudança de preço.
- `admin_memberships`: vínculo com `auth.users`.

As ofertas preservam IDs de texto usados nas URLs. Produtos podem ter ofertas em lojas distintas. Excluir uma oferta remove seu histórico; produtos compartilhados não são excluídos enquanto houver referência.

## Administração

Criar o usuário pelo Supabase Auth e vincular seu UUID pelo SQL Editor:

```sql
insert into public.admin_memberships(user_id)
values ('UUID-DO-USUARIO')
on conflict (user_id) do nothing;
```

Manter cadastro público desativado e credenciais sob controle dos responsáveis. Não há promoção de administrador pela API pública.

## RLS

Todas as tabelas do catálogo têm RLS habilitada. Visitantes consultam apenas ofertas públicas elegíveis. Usuários autenticados comuns não podem editar o catálogo. Administradores gerenciam ofertas, mas não editam diretamente a lista de administradores ou o histórico pela API.

As funções transacionais são executadas com os privilégios do usuário. A verificação de vínculo e a validação do JWT também são feitas no Worker. A chave publishable não substitui a identidade administrativa.

## Verificação

Os scripts de `supabase/tests/` verificam visibilidade, rascunhos, expiração, isolamento de permissões, histórico e atomicidade. Eles criam registros temporários e terminam com ROLLBACK. Em caso de erro no SQL Editor, executar ROLLBACK antes de repetir. Os testes automatizados executam essas migrações em PostgreSQL via PGlite.
