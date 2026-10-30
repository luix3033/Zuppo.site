-- Ative pg_cron em Supabase → Database → Extensions antes de executar.
-- Execute depois da migração 005, como postgres no SQL Editor.
do $$ declare job bigint; begin
 select jobid into job from cron.job where jobname='zuppo-purge-offers-72h';
 if job is not null then perform cron.unschedule(job);end if;
 perform cron.schedule('zuppo-purge-offers-72h','* * * * *','select public.zuppo_purge_old_offers();');
end $$;
