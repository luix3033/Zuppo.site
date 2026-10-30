import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogConfiguration} from '../worker/catalog-config.js';
import {createHandler} from '../worker/index.js';
test('Vite build names do not satisfy Worker runtime configuration',()=>{
 assert.deepEqual(catalogConfiguration({CATALOG_PROVIDER:'supabase',VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_ANON_KEY:'sb_publishable_test'}),['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY']);
 assert.deepEqual(catalogConfiguration({CATALOG_PROVIDER:'supabase',SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'}),[]);
});
test('health identifies missing bindings without disclosing configuration values',async()=>{
 const response=await createHandler().fetch(new Request('https://site.test/healthz'),{CATALOG_PROVIDER:'supabase',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_private_fixture'});
 assert.equal(response.status,503);const body=await response.text();assert.ok(body.includes('SUPABASE_URL'));assert.ok(body.includes('ASSETS'));assert.ok(!body.includes('private_fixture'));
});
