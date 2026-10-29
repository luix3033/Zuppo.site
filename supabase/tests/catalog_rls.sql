-- Executar no SQL Editor de um projeto de TESTES após a migração.
-- Tudo é revertido no fim. Qualquer falha deve interromper a execução.
begin;
insert into auth.users(id,email) values
 ('f0000000-0000-4000-8000-000000000001','zuppo-rls-admin@example.invalid'),
 ('f0000000-0000-4000-8000-000000000002','zuppo-rls-user@example.invalid');
insert into public.admin_memberships(user_id) values ('f0000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000001',true);
insert into public.products(id,name,category_id,image_url) values
 ('f0000000-0000-4000-8000-000000000003','Teste transacional RLS','games','https://example.invalid/image.webp');
insert into public.offers(id,product_id,marketplace_id,current_price_cents,affiliate_url,status,available,published_at) values
 ('rls-test-public','f0000000-0000-4000-8000-000000000003','amazon',10000,'https://example.invalid/offer','active',true,now()),
 ('rls-test-draft','f0000000-0000-4000-8000-000000000003','amazon',10000,null,'draft',false,null),
 ('rls-test-expired','f0000000-0000-4000-8000-000000000003','amazon',10000,'https://example.invalid/offer','active',true,now()-interval '2 days');
update public.offers set expires_at=now()-interval '1 day' where id='rls-test-expired';
update public.offers set current_price_cents=9000 where id='rls-test-public';
do $$ begin
 if (select count(*) from public.offer_price_history where offer_id='rls-test-public') <> 2 then raise exception 'Histórico incorreto'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if (select count(*) from public.offers where id like 'rls-test-%') <> 1 then raise exception 'Vazamento de rascunho/expirada'; end if;
 if (select count(*) from public.offer_price_history where offer_id='rls-test-draft') <> 0 then raise exception 'Vazamento de histórico'; end if;
 begin
  delete from public.offers where id='rls-test-public';
  raise exception 'Visitante conseguiu excluir';
 exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000002',true);
do $$ declare affected integer; begin
 if public.is_zuppo_admin() then raise exception 'Usuário comum virou admin'; end if;
 update public.offers set current_price_cents=1 where id='rls-test-public';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'Usuário comum conseguiu editar'; end if;
 begin
  insert into public.admin_memberships(user_id) values ('f0000000-0000-4000-8000-000000000002');
  raise exception 'Usuário comum conseguiu se promover';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
