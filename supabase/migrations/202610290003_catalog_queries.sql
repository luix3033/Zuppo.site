-- Consulta pública paginada. Executar após as migrações 001 e 002.
-- Esta migração pode ser reexecutada para atualizar a função sem excluir dados.
begin;

-- Busca textual literal, sem curingas ou expressões regulares fornecidas pelo visitante.
create or replace function public.zuppo_search_text(value text) returns text
language sql immutable strict parallel safe set search_path = ''
as $$ select translate(lower(value), 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'); $$;
revoke all on function public.zuppo_search_text(text) from public;
grant execute on function public.zuppo_search_text(text) to anon, authenticated;

-- Autoridade HTTPS sem credenciais; porta e endereços IP são validados.
create or replace function public.zuppo_public_https(value text) returns boolean
language plpgsql immutable strict parallel safe set search_path = '' as $$
declare parts text[]; host text;
begin
  if length(value)>2000 then return false; end if;
  parts:=regexp_match(value,'^https://(\[[0-9A-Fa-f:]+\]|[A-Za-z0-9.-]+)(:([0-9]{1,5}))?([/?#][^[:space:]\\]*)?$');
  if parts is null or (parts[3] is not null and parts[3]::integer>65535) then return false;end if;
  host:=parts[1];
  if left(host,1)='[' then
    return family(substring(host from 2 for length(host)-2)::inet)=6;
  elsif host ~ '^[0-9.]+$' then
    return family(host::inet)=4;
  end if;
  return length(host)<=253 and host !~ '(^\.|\.\.|\.-|^-$)';
exception when invalid_text_representation then return false;
end; $$;
revoke all on function public.zuppo_public_https(text) from public;
grant execute on function public.zuppo_public_https(text) to anon, authenticated;

create or replace function public.zuppo_query_offers(filters jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security invoker set search_path = '' set row_security = on
as $$
declare
  args jsonb := coalesce(filters, '{}'::jsonb);
  query_text text := '';
  category_key text;
  store_key text;
  minimum_cents numeric := 0;
  maximum_cents numeric := 9007199254740991;
  minimum_discount numeric := 0;
  order_key text := 'recent';
  page_size integer := 24;
  requested_page integer := 1;
  selected_ids text[];
  selected_featured boolean;
  selected_flash boolean;
  key text;
begin
  if jsonb_typeof(args) <> 'object' or octet_length(args::text) > 32768 then
    raise invalid_parameter_value using message = 'Filtros inválidos';
  end if;
  if exists(select 1 from jsonb_object_keys(args) k where k not in ('q','category','store','minPrice','maxPrice','minDiscount','sort','limit','page','ids','featured','flash')) then
    raise invalid_parameter_value using message = 'Filtro desconhecido';
  end if;
  foreach key in array array['q','category','store','sort'] loop
    if args ? key and jsonb_typeof(args->key) <> 'string' then
      raise invalid_parameter_value using message = 'Filtro textual inválido';
    end if;
  end loop;
  query_text := public.zuppo_search_text(trim(coalesce(args->>'q','')));
  if length(query_text) > 200 or cardinality(regexp_split_to_array(query_text, '\s+')) > 12 then
    raise invalid_parameter_value using message = 'Busca muito extensa';
  end if;
  category_key := nullif(nullif(args->>'category',''),'all');
  store_key := nullif(nullif(args->>'store',''),'all');
  if (category_key is not null and (length(category_key)>50 or category_key !~ '^[a-z0-9-]+$'))
    or (store_key is not null and (length(store_key)>50 or store_key !~ '^[a-z0-9-]+$')) then
    raise invalid_parameter_value using message = 'Categoria ou loja inválida';
  end if;
  foreach key in array array['minPrice','maxPrice','minDiscount','limit','page'] loop
    if args ? key and jsonb_typeof(args->key) <> 'number' then
      raise invalid_parameter_value using message = 'Filtro numérico inválido';
    end if;
  end loop;
  if args ? 'minPrice' then minimum_cents := ceil((args->>'minPrice')::numeric * 100); end if;
  if args ? 'maxPrice' then maximum_cents := floor((args->>'maxPrice')::numeric * 100); end if;
  if minimum_cents < 0 or maximum_cents < 0 or minimum_cents > 9007199254740991 or maximum_cents > 9007199254740991 then
    raise invalid_parameter_value using message = 'Faixa de preço inválida';
  end if;
  if args ? 'minDiscount' then minimum_discount := (args->>'minDiscount')::numeric; end if;
  if minimum_discount < 0 or minimum_discount > 100 or minimum_discount <> floor(minimum_discount) then
    raise invalid_parameter_value using message = 'Desconto inválido';
  end if;
  if args ? 'limit' then
    if (args->>'limit')::numeric <> floor((args->>'limit')::numeric) or (args->>'limit')::numeric not between 1 and 100 then
      raise invalid_parameter_value using message = 'Limite inválido';
    end if;
    page_size := (args->>'limit')::integer;
  end if;
  if args ? 'page' then
    if (args->>'page')::numeric <> floor((args->>'page')::numeric) or (args->>'page')::numeric not between 1 and 10000 then
      raise invalid_parameter_value using message = 'Página inválida';
    end if;
    requested_page := (args->>'page')::integer;
  end if;
  order_key := coalesce(args->>'sort','recent');
  if order_key not in ('recent','price-asc','price-desc','discount') then
    raise invalid_parameter_value using message = 'Ordenação inválida';
  end if;
  if args ? 'ids' then
    if jsonb_typeof(args->'ids') <> 'array' or jsonb_array_length(args->'ids') > 200 then
      raise invalid_parameter_value using message = 'Seleção de ofertas inválida';
    end if;
    if exists(select 1 from jsonb_array_elements(args->'ids') i where jsonb_typeof(i) <> 'string' or (i #>> '{}') !~ '^[a-zA-Z0-9_-]{1,100}$') then
      raise invalid_parameter_value using message = 'Identificador de oferta inválido';
    end if;
    select coalesce(array_agg(distinct id),array[]::text[]) into selected_ids from jsonb_array_elements_text(args->'ids') id;
  end if;
  foreach key in array array['featured','flash'] loop
    if args ? key and jsonb_typeof(args->key) <> 'boolean' then
      raise invalid_parameter_value using message = 'Filtro de seleção inválido';
    end if;
  end loop;
  if args ? 'featured' then selected_featured := (args->>'featured')::boolean; end if;
  if args ? 'flash' then selected_flash := (args->>'flash')::boolean; end if;

  return (
    with eligible as not materialized (
      select o.id, o.current_price_cents, o.published_at,
        case when o.previous_price_cents > o.current_price_cents then round((1-o.current_price_cents::numeric/o.previous_price_cents)*100) else 0 end as discount,
        jsonb_build_object(
          'id',o.id,'marketplace_id',o.marketplace_id,
          'current_price_cents',o.current_price_cents,'previous_price_cents',o.previous_price_cents,
          'affiliate_url',o.affiliate_url,'status',o.status,'available',o.available,
          'featured',o.featured,'flash',o.flash,'source',o.source,'shipping',o.shipping,
          'published_at',o.published_at,'created_at',o.created_at,'updated_at',o.updated_at,'expires_at',o.expires_at,
          'product',jsonb_build_object(
          'name',p.name,'description',p.description,'category_id',p.category_id,
          'image_url',p.image_url,'specs',p.specs)) as item
      from public.offers o
      join public.products p on p.id=o.product_id
      join public.categories c on c.id=p.category_id
      join public.marketplaces m on m.id=o.marketplace_id
      where o.status='active' and o.available and o.published_at<=now()
        and (o.expires_at is null or o.expires_at>now()) and c.active and m.active
        and public.zuppo_public_https(o.affiliate_url)
        and (p.image_url ~ '^/media/[a-f0-9-]+\.(png|jpg|webp)$'
          or public.zuppo_public_https(p.image_url))
        and (category_key is null or p.category_id=category_key)
        and (store_key is null or o.marketplace_id=store_key)
        and o.current_price_cents between minimum_cents and maximum_cents
        and (selected_ids is null or o.id=any(selected_ids))
        and (selected_featured is null or o.featured=selected_featured)
        and (selected_flash is null or o.flash=selected_flash)
        and not exists (
          select 1 from unnest(regexp_split_to_array(query_text,'\s+')) term
          where term<>'' and position(term in public.zuppo_search_text(p.name||' '||c.name))=0
        )
    ), filtered as not materialized (
      select * from eligible where discount>=minimum_discount
    ), totals as (
      select count(*) as count from filtered
    ), paging as (
      select count, greatest(1,ceil(count::numeric/page_size)::integer) as pages,
        least(requested_page,greatest(1,ceil(count::numeric/page_size)::integer)) as actual_page from totals
    )
    select jsonb_build_object(
      'items',coalesce((select jsonb_agg(chosen.item order by chosen.position) from (
        select item,row_number() over (
          order by case when order_key='price-asc' then current_price_cents end asc,
            case when order_key='price-desc' then current_price_cents end desc,
            case when order_key='discount' then discount end desc,
            published_at desc,id asc) as position
        from filtered
        order by case when order_key='price-asc' then current_price_cents end asc,
          case when order_key='price-desc' then current_price_cents end desc,
          case when order_key='discount' then discount end desc,
          published_at desc,id asc
        limit page_size offset ((paging.actual_page-1)*page_size)
      ) chosen),'[]'::jsonb),
      'total',paging.count,'page',paging.actual_page,'limit',page_size,'totalPages',paging.pages
    ) from paging
  );
end; $$;
revoke all on function public.zuppo_query_offers(jsonb) from public;
grant execute on function public.zuppo_query_offers(jsonb) to anon, authenticated;

-- Complementa os índices de status/preço/data existentes sem exigir extensões.
create index if not exists offers_public_store_recent_idx on public.offers(marketplace_id,published_at desc,id) where status='active' and available;
create index if not exists offers_public_featured_recent_idx on public.offers(published_at desc,id) where status='active' and available and featured;
create index if not exists offers_public_flash_recent_idx on public.offers(published_at desc,id) where status='active' and available and flash;
commit;
