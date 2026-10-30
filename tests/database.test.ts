import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('PostgreSQL executes migrations and verifies RLS, atomic catalog writes, visibility and history',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;
   create schema auth;create table auth.users(id uuid primary key,email text);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema public,auth to anon,authenticated;
   grant execute on function auth.uid() to anon,authenticated;`);
  for(const file of ['migrations/202610290001_catalog.sql','migrations/202610290002_admin_catalog.sql','migrations/202610290003_catalog_queries.sql','migrations/202610290003_catalog_queries.sql','migrations/202610300006_categories.sql','migrations/202610300006_categories.sql','tests/categories.sql','tests/catalog_rls.sql','tests/admin_catalog.sql','tests/catalog_queries.sql']){
   await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));
  }
 }finally{await db.close();}
});
