import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
test('retention expires published offers, preserves deadlines on edit and deletes only due offers',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create table public.offers(id text primary key,published_at timestamptz,expires_at timestamptz);insert into public.offers values('existing',now()-interval '10 days',null);`);
 const sql=await readFile(new URL('../supabase/migrations/202610290005_offer_retention.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);
 await db.exec(`insert into public.offers values('draft',null,null,null);insert into public.offers(id,published_at) values('new',now());`);
 const before=await db.query(`select delete_after from public.offers where id='new'`);
 await db.exec(`update public.offers set expires_at=null,delete_after=now()+interval '1 year' where id='new'`);
 assert.deepEqual((await db.query(`select delete_after from public.offers where id='new'`)).rows,before.rows);
 assert.equal((await db.query(`select count(*)::int as n from public.offers where id in ('existing','new') and delete_after>now() and expires_at=delete_after`)).rows[0].n,2);
 await db.exec(`alter table public.offers disable trigger offers_retention;update public.offers set delete_after=now()-interval '1 second' where id='new';alter table public.offers enable trigger offers_retention;`);
 assert.equal((await db.query(`select public.zuppo_purge_old_offers() as n`)).rows[0].n,1);
 assert.equal((await db.query(`select count(*)::int as n from public.offers`)).rows[0].n,2);
 await db.exec('set role anon');await assert.rejects(db.query('select public.zuppo_purge_old_offers()'));
 }finally{await db.close();}
});
