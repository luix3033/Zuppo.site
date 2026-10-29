-- Etapa 3: gravação atômica com a identidade do administrador (sem service_role).
begin;
create function public.zuppo_save_offer(payload jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  offer_key text := payload->>'id';
  product_key uuid;
  published timestamptz;
  price bigint := (payload->>'current_price_cents')::bigint;
  prior_price bigint := (payload->>'previous_price_cents')::bigint;
  offer_status text := payload->>'status';
begin
  if not public.is_zuppo_admin() then raise insufficient_privilege using message = 'Administrador obrigatório'; end if;
  if offer_key is null or offer_key !~ '^[a-zA-Z0-9-]{1,100}$'
    or nullif(trim(payload->>'name'),'') is null
    or nullif(trim(payload->>'description'),'') is null
    or price is null or price <= 0
    or (prior_price is not null and prior_price < price)
    or offer_status is null or offer_status not in ('draft','active','expired') then
    raise check_violation using message = 'Dados da oferta inválidos';
  end if;
  -- Serializa operações do mesmo ID, incluindo cadastros concorrentes.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('zuppo-offer:' || offer_key,0));
  select product_id, published_at into product_key, published
    from public.offers where id = offer_key for update;
  -- Alterar uma oferta não deve modificar outra que compartilhe o produto.
  if product_key is not null and exists(select 1 from public.offers where product_id=product_key and id<>offer_key) then
    product_key := null;
  end if;
  if product_key is null then
    insert into public.products(name,description,category_id,image_url,specs)
    values(trim(payload->>'name'),trim(payload->>'description'),payload->>'category_id',nullif(payload->>'image_url',''),'{}')
    returning id into product_key;
  else
    update public.products set name=trim(payload->>'name'), description=trim(payload->>'description'),
      category_id=payload->>'category_id', image_url=nullif(payload->>'image_url','') where id=product_key;
  end if;
  if offer_status='active' and not exists(select 1 from public.products where id=product_key and image_url is not null) then
    raise check_violation using message = 'Publicação exige imagem';
  end if;
  if offer_status='active' and published is null then published:=now(); end if;
  insert into public.offers(id,product_id,marketplace_id,current_price_cents,previous_price_cents,
    affiliate_url,status,available,featured,flash,source,published_at,expires_at)
  values(offer_key,product_key,payload->>'marketplace_id',price,prior_price,nullif(payload->>'affiliate_url',''),
    offer_status,coalesce((payload->>'available')::boolean,false),coalesce((payload->>'featured')::boolean,false),
    coalesce((payload->>'flash')::boolean,false),'Cadastro administrativo',published,(payload->>'expires_at')::timestamptz)
  on conflict(id) do update set product_id=excluded.product_id,marketplace_id=excluded.marketplace_id,
    current_price_cents=excluded.current_price_cents,previous_price_cents=excluded.previous_price_cents,
    affiliate_url=excluded.affiliate_url,status=excluded.status,available=excluded.available,
    featured=excluded.featured,flash=excluded.flash,source=excluded.source,
    published_at=excluded.published_at,expires_at=excluded.expires_at;
  return jsonb_build_object('id',offer_key);
end; $$;
create function public.zuppo_delete_offer(offer_key text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare product_key uuid;
begin
  if not public.is_zuppo_admin() then raise insufficient_privilege using message = 'Administrador obrigatório'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('zuppo-offer:' || offer_key,0));
  delete from public.offers where id=offer_key returning product_id into product_key;
  if product_key is not null then
    delete from public.products where id=product_key and not exists(select 1 from public.offers where product_id=product_key);
  end if;
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.zuppo_save_offer(jsonb) from public,anon;
revoke all on function public.zuppo_delete_offer(text) from public,anon;
grant execute on function public.zuppo_save_offer(jsonb) to authenticated;
grant execute on function public.zuppo_delete_offer(text) to authenticated;
commit;
