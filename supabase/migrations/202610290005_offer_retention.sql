-- Independente da comparação: requer apenas o catálogo 001/002.
begin;
alter table public.offers add column if not exists delete_after timestamptz;
-- Ofertas existentes recebem 72 horas a partir da ativação, evitando exclusão imediata.
update public.offers set delete_after=greatest(now(),published_at)+interval '72 hours'
where published_at is not null and delete_after is null;
create or replace function public.zuppo_offer_retention() returns trigger
language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' then new.delete_after:=old.delete_after;else new.delete_after:=null;end if;
 if new.published_at is not null and new.delete_after is null then
  new.delete_after:=greatest(now(),new.published_at)+interval '72 hours';
 end if;
 if new.delete_after is not null then
  new.expires_at:=least(coalesce(new.expires_at,new.delete_after),new.delete_after);
 end if;
 return new;
end $$;
revoke all on function public.zuppo_offer_retention() from public,anon,authenticated;
drop trigger if exists offers_retention on public.offers;
create trigger offers_retention before insert or update on public.offers for each row execute function public.zuppo_offer_retention();
update public.offers set expires_at=least(coalesce(expires_at,delete_after),delete_after) where delete_after is not null;
create index if not exists offers_delete_after_idx on public.offers(delete_after) where delete_after is not null;
create or replace function public.zuppo_purge_old_offers() returns integer
language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
 -- O produto e sua imagem são preservados; somente oferta e histórico em cascata são removidos.
 with candidates as (
  select id from public.offers where delete_after<=now() order by delete_after,id limit 1000 for update skip locked
 ), deleted as (
  delete from public.offers o using candidates c where o.id=c.id returning o.id
 ) select count(*) into removed from deleted;
 return removed;
end $$;
revoke all on function public.zuppo_purge_old_offers() from public,anon,authenticated;
commit;
