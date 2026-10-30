import {test} from 'node:test';import assert from 'node:assert/strict';
import {ocarinaPreset} from '../src/features/homepage/presets';
import {defaultHome} from '../src/features/homepage/config';
import {validHome} from '../worker/home-validation.js';
test('Ocarina preset is valid, has real catalog filters, preserves contact channels and never mutates the current home',()=>{
 const original=structuredClone(defaultHome);original.community.instagram='https://www.instagram.com/zuppo.site/';const before=JSON.stringify(original);
 const preset=ocarinaPreset(original);assert.ok(validHome(preset));assert.equal(JSON.stringify(original),before);assert.equal(preset.community.instagram,original.community.instagram);assert.equal(preset.theme,'ocarina');assert.equal(preset.hero.image,'/images/zuppinho-ocarina.png');assert.deepEqual(preset.sections,original.sections);assert.deepEqual(preset.categories.ids,defaultHome.categories.ids);assert.equal(preset.categories.ids.length,6);assert.equal(preset.hero.buttonUrl,'/ofertas');assert.ok(preset.sections.some(s=>s.type==='flash'));assert.equal(validHome({...preset,theme:'arbitrary'}),false);
});

test('legacy restricted campaign restores the complete catalog structure',()=>{const old=structuredClone(defaultHome);old.theme='ocarina';old.categories.ids=['games'];old.sections=[{...old.sections.find(s=>s.type==='offers')!,id:'ocarina-games',mode:'category',category:'games'}];const updated=ocarinaPreset(old);assert.deepEqual(updated.sections,defaultHome.sections);assert.equal(updated.categories.ids.length,6);});
