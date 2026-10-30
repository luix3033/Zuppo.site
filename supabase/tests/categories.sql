do $$ begin
 if (select count(*) from public.categories where id in ('ferramentas','carros','limpeza','roupa-infantil','brinquedos','datas-comemorativas') and active)<>6 then raise exception 'Categorias novas ausentes';end if;
end $$;
