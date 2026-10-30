-- Acrescenta metadados de categorias; não altera nem exclui ofertas existentes.
begin;
insert into public.categories(id,name,active) values
 ('ferramentas','Ferramentas',true),
 ('carros','Carros',true),
 ('limpeza','Limpeza',true),
 ('roupa-infantil','Roupa infantil',true),
 ('brinquedos','Brinquedos',true),
 ('datas-comemorativas','Datas comemorativas',true)
on conflict(id) do nothing;
commit;
