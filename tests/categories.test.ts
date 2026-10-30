import {test} from 'node:test';import assert from 'node:assert/strict';import {categories} from '../src/data/catalog';import {defaultHome} from '../src/features/homepage/config';import {parseCatalogQuery} from '../worker/supabase.js';import {validHome} from '../worker/home-validation.js';
test('all sixteen categories are filterable and editable while home shows six main choices',()=>{
 assert.equal(categories.length,16);assert.equal(defaultHome.categories.ids.length,6);
 for(const category of categories)assert.equal(parseCatalogQuery(new URLSearchParams({category:category.id})).category,category.id);
 assert.ok(validHome({...defaultHome,categories:{...defaultHome.categories,ids:categories.map(c=>c.id)}}));
});
