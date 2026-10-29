-- Teste transacional: não deixa identidades ou ofertas de teste no banco.
begin;
insert into auth.users(id,email) values
 ('f1000000-0000-4000-8000-000000000001','zuppo-crud-admin@example.invalid'),
 ('f1000000-0000-4000-8000-000000000002','zuppo-crud-user@example.invalid');
insert into public.admin_memberships(user_id) values ('f1000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
select public.zuppo_save_offer('{"id":"sql-crud-check","name":"Teste temporário","description":"Somente transação de teste","category_id":"games","marketplace_id":"amazon","current_price_cents":19990,"status":"draft","available":true}'::jsonb);
do $$ declare product_before uuid; before_count integer; begin
 select product_id into product_before from public.offers where id='sql-crud-check';
 select count(*) into before_count from public.products;
 -- FK de loja inválida deve desfazer também a criação do produto.
 begin
  perform public.zuppo_save_offer('{"id":"sql-invalid-check","name":"Não persistir","description":"Falha esperada","category_id":"games","marketplace_id":"loja-inexistente","current_price_cents":10000,"status":"draft"}'::jsonb);
  raise exception 'FK inválida aceita';
 exception when foreign_key_violation then null; end;
 if (select count(*) from public.products)<>before_count then raise exception 'Produto órfão após erro'; end if;
 if exists(select 1 from public.offers where id='sql-invalid-check') then raise exception 'Oferta inválida persistida'; end if;
 perform public.zuppo_save_offer('{"id":"sql-crud-check","name":"Teste temporário atualizado","description":"Somente transação de teste","category_id":"games","marketplace_id":"amazon","image_url":"https://example.invalid/product.webp","affiliate_url":"https://example.invalid/buy","current_price_cents":17990,"previous_price_cents":19990,"status":"active","available":true,"featured":true}'::jsonb);
 if (select product_id from public.offers where id='sql-crud-check')<>product_before then raise exception 'Atualização duplicou produto'; end if;
 if (select count(*) from public.offer_price_history where offer_id='sql-crud-check')<>2 then raise exception 'Histórico incorreto'; end if;
 if not exists(select 1 from public.offers where id='sql-crud-check' and published_at is not null and featured) then raise exception 'Publicação incorreta'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if not exists(select 1 from public.offers where id='sql-crud-check') then raise exception 'Publicada não visível'; end if;
 begin
  perform public.zuppo_delete_offer('sql-crud-check');raise exception 'Visitante conseguiu excluir';
 exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
do $$ begin
 begin
  perform public.zuppo_delete_offer('sql-crud-check');raise exception 'Usuário comum conseguiu excluir';
 exception when insufficient_privilege then null; end;
 begin
  perform public.zuppo_save_offer('{}'::jsonb);raise exception 'Usuário comum conseguiu gravar';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
update public.offers set available=false where id='sql-crud-check';
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if exists(select 1 from public.offers where id='sql-crud-check') then raise exception 'Desativada ainda pública'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
select public.zuppo_delete_offer('sql-crud-check');
do $$ begin
 if exists(select 1 from public.offers where id='sql-crud-check') then raise exception 'Exclusão não aplicada'; end if;
 if exists(select 1 from public.offer_price_history where offer_id='sql-crud-check') then raise exception 'Histórico órfão'; end if;
end $$;
reset role;
rollback;
