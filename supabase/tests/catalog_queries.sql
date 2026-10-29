begin;
insert into auth.users(id,email) values ('f2000000-0000-4000-8000-000000000001','query-admin@example.invalid');
insert into public.admin_memberships(user_id) values ('f2000000-0000-4000-8000-000000000001');
insert into public.products(id,name,description,category_id,image_url) values
 ('f2000000-0000-4000-8000-000000000002','Fone Ótimo','Teste temporário','informatica','https://example.invalid/image.webp'),
 ('f2000000-0000-4000-8000-000000000003','Controle Gamer','Teste temporário','games','https://example.invalid/image.webp');
insert into public.offers(id,product_id,marketplace_id,current_price_cents,previous_price_cents,affiliate_url,status,available,featured,flash,published_at,expires_at) values
 ('query-a','f2000000-0000-4000-8000-000000000002','amazon',10001,20002,'https://example.invalid/a','active',true,true,false,now()-interval '1 hour',null),
 ('query-b','f2000000-0000-4000-8000-000000000003','shopee',20000,25000,'https://example.invalid/b','active',true,false,true,now()-interval '2 hours',null),
 ('query-draft','f2000000-0000-4000-8000-000000000002','amazon',9000,null,null,'draft',true,false,false,null,null),
 ('query-expired','f2000000-0000-4000-8000-000000000002','amazon',9000,null,'https://example.invalid/e','active',true,false,false,now()-interval '2 days',now()-interval '1 day'),
 ('query-hidden','f2000000-0000-4000-8000-000000000002','amazon',9000,null,'https://example.invalid/h','active',false,false,false,now()-interval '1 hour',null),
 ('query-unsafe','f2000000-0000-4000-8000-000000000002','amazon',9000,null,'https://example.invalid:bad/u','active',true,false,false,now()-interval '1 hour',null);
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ declare result jsonb; begin
 result:=public.zuppo_query_offers('{"ids":["query-a","query-b","query-draft","query-expired","query-hidden","query-unsafe"],"limit":1,"page":2,"sort":"price-asc"}');
 if (result->>'total')::integer<>2 or result#>>'{items,0,id}'<>'query-b' or (result->>'totalPages')::integer<>2 then raise exception 'Paginação incorreta: %',result;end if;
 result:=public.zuppo_query_offers('{"q":"fone otimo informatica","minPrice":100.01,"maxPrice":100.01,"minDiscount":50,"store":"amazon","category":"informatica","featured":true}');
 if (result->>'total')::integer<>1 or result#>>'{items,0,id}'<>'query-a' or result#>>'{items,0,product,name}'<>'Fone Ótimo' then raise exception 'Filtros incorretos: %',result;end if;
 result:=public.zuppo_query_offers('{"ids":[]}');
 if (result->>'total')::integer<>0 then raise exception 'Seleção vazia não pode listar tudo';end if;
 result:=public.zuppo_query_offers('{"flash":true,"sort":"discount"}');
 if (result->>'total')::integer<>1 or result#>>'{items,0,id}'<>'query-b' then raise exception 'Seleção relâmpago incorreta';end if;
 result:=public.zuppo_query_offers('{"ids":["query-a"],"minPrice":100.011}');
 if (result->>'total')::integer<>0 then raise exception 'Limite de centavos incorreto';end if;
 result:=public.zuppo_query_offers('{"ids":["query-a","query-b"],"page":999,"limit":1}');
 if (result->>'page')::integer<>2 then raise exception 'Página fora do intervalo não ajustada';end if;
 begin
  perform public.zuppo_query_offers('{"limit":1000}');raise exception 'Limite não validado';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.zuppo_query_offers('{"ids":"query-a"}');raise exception 'IDs não validados';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.zuppo_query_offers('{"q":{"unexpected":true}}');raise exception 'Busca não validada';
 exception when invalid_parameter_value then null;end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',true);
do $$ declare result jsonb;begin
 result:=public.zuppo_query_offers('{"ids":["query-draft","query-expired","query-hidden","query-unsafe"]}');
 if (result->>'total')::integer<>0 then raise exception 'RPC público revelou dados administrativos';end if;
end $$;
reset role;
rollback;
