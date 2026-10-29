-- Execute uma única vez pelo SQL Editor ou por supabase db push.
-- Apenas esquema e cadastros institucionais: nenhum produto demonstrativo.
begin;

create table public.categories (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null check (length(trim(name)) > 0),
  active boolean not null default true
);
create table public.marketplaces (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null check (length(trim(name)) > 0),
  active boolean not null default true
);
create table public.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
-- Sem cadastro ou promoção de administradores pela API.
create function public.is_zuppo_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.admin_memberships where user_id = auth.uid()); $$;
revoke all on function public.is_zuppo_admin() from public;
grant execute on function public.is_zuppo_admin() to anon, authenticated;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 300),
  description text not null default '',
  category_id text not null references public.categories(id),
  image_url text,
  specs jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (image_url is null or image_url ~ '^https://[^/@[:space:]]+([/:?#]|$)' or image_url ~ '^/media/[a-zA-Z0-9._-]+$')
);
create table public.offers (
  -- Texto preserva IDs e links /go/:id já existentes.
  id text primary key default gen_random_uuid()::text check (id ~ '^[a-zA-Z0-9_-]+$'),
  product_id uuid not null references public.products(id) on delete restrict,
  marketplace_id text not null references public.marketplaces(id),
  current_price_cents bigint not null check (current_price_cents > 0 and current_price_cents <= 9007199254740991),
  previous_price_cents bigint check (previous_price_cents >= current_price_cents and previous_price_cents <= 9007199254740991),
  affiliate_url text check (affiliate_url is null or affiliate_url ~ '^https://[^/@[:space:]]+([/:?#]|$)'),
  status text not null default 'draft' check (status in ('draft','active','expired')),
  available boolean not null default false,
  featured boolean not null default false,
  flash boolean not null default false,
  source text not null default 'manual' check (length(trim(source)) > 0),
  shipping text,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'active' or (affiliate_url is not null and published_at is not null)),
  check (expires_at is null or published_at is null or expires_at > published_at)
);
create table public.offer_price_history (
  id bigint generated always as identity primary key,
  offer_id text not null references public.offers(id) on delete cascade,
  price_cents bigint not null check (price_cents > 0),
  recorded_at timestamptz not null default now(),
  note text not null default 'Preço registrado'
);
create index products_category_idx on public.products(category_id);
create index offers_product_idx on public.offers(product_id);
create index offers_marketplace_idx on public.offers(marketplace_id);
create index offers_public_recent_idx on public.offers(published_at desc, id) where status = 'active' and available;
create index offers_public_price_idx on public.offers(current_price_cents, id) where status = 'active' and available;
create index offers_expiry_idx on public.offers(expires_at) where status = 'active';
create index price_history_offer_idx on public.offer_price_history(offer_id, recorded_at desc);

create function public.zuppo_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
create trigger products_touch before update on public.products for each row execute function public.zuppo_touch_updated_at();
create trigger offers_touch before update on public.offers for each row execute function public.zuppo_touch_updated_at();
create function public.zuppo_record_price() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.offer_price_history(offer_id, price_cents) values (new.id, new.current_price_cents);
  elsif new.current_price_cents is distinct from old.current_price_cents then
    insert into public.offer_price_history(offer_id, price_cents) values (new.id, new.current_price_cents);
  end if;
  return new;
end; $$;
revoke all on function public.zuppo_record_price() from public;
revoke all on function public.zuppo_touch_updated_at() from public;
create trigger offers_record_price after insert or update on public.offers for each row execute function public.zuppo_record_price();

alter table public.categories enable row level security;
alter table public.marketplaces enable row level security;
alter table public.products enable row level security;
alter table public.offers enable row level security;
alter table public.offer_price_history enable row level security;
alter table public.admin_memberships enable row level security;

-- Privilégios explícitos, sem depender dos defaults de cada projeto Supabase.
revoke all on public.categories, public.marketplaces, public.products, public.offers, public.offer_price_history, public.admin_memberships from anon, authenticated;
grant select on public.categories, public.marketplaces, public.products, public.offers, public.offer_price_history to anon, authenticated;
grant insert, update, delete on public.categories, public.marketplaces, public.products, public.offers to authenticated;
grant select on public.admin_memberships to authenticated;
create policy membership_self on public.admin_memberships for select to authenticated using (user_id = (select auth.uid()));
create policy categories_read on public.categories for select to anon, authenticated using (active or (select public.is_zuppo_admin()));
create policy marketplaces_read on public.marketplaces for select to anon, authenticated using (active or (select public.is_zuppo_admin()));
create policy offers_read on public.offers for select to anon, authenticated using (
  (select public.is_zuppo_admin()) or (
    status = 'active' and available and published_at <= now()
    and (expires_at is null or expires_at > now())
    and exists(select 1 from public.categories c join public.products p on p.category_id = c.id where p.id = offers.product_id and c.active)
    and exists(select 1 from public.marketplaces m where m.id = marketplace_id and m.active)
  )
);
-- A visibilidade do produto não consulta offers para evitar recursão RLS.
-- Função restrita responde apenas se há uma oferta pública, sem retornar dados.
create function public.zuppo_product_visible(product_uuid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (
   select 1 from public.offers o
   join public.products p on p.id = o.product_id
   join public.categories c on c.id = p.category_id
   join public.marketplaces m on m.id = o.marketplace_id
   where p.id = product_uuid and o.status = 'active' and o.available
     and o.published_at <= now() and (o.expires_at is null or o.expires_at > now())
     and c.active and m.active and p.image_url is not null
 ); $$;
revoke all on function public.zuppo_product_visible(uuid) from public;
grant execute on function public.zuppo_product_visible(uuid) to anon, authenticated;
create policy products_read on public.products for select to anon, authenticated using ((select public.is_zuppo_admin()) or public.zuppo_product_visible(id));
create policy history_read on public.offer_price_history for select to anon, authenticated using (
 (select public.is_zuppo_admin()) or exists(select 1 from public.offers o where o.id = offer_id)
);
-- WITH CHECK também protege a versão nova do registro no UPDATE.
create policy categories_admin on public.categories for all to authenticated using ((select public.is_zuppo_admin())) with check ((select public.is_zuppo_admin()));
create policy marketplaces_admin on public.marketplaces for all to authenticated using ((select public.is_zuppo_admin())) with check ((select public.is_zuppo_admin()));
create policy products_admin on public.products for all to authenticated using ((select public.is_zuppo_admin())) with check ((select public.is_zuppo_admin()));
create policy offers_admin on public.offers for all to authenticated using ((select public.is_zuppo_admin())) with check ((select public.is_zuppo_admin()));

insert into public.categories(id,name) values
 ('games','Games'),('informatica','Informática'),('celulares','Celulares'),('casa','Casa'),
 ('eletrodomesticos','Eletrodomésticos'),('esporte','Esporte'),('beleza','Beleza'),('bebes','Bebês'),('pets','Pets'),('moda','Moda');
insert into public.marketplaces(id,name) values ('amazon','Amazon'),('mercado-livre','Mercado Livre'),('shopee','Shopee');
commit;
