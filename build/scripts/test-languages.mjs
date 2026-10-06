import fs from 'node:fs'
import assert from 'node:assert/strict'
const source = JSON.parse(fs.readFileSync(new URL('../frontend/translations.json', import.meta.url), 'utf8'))
const locales = ['cs','en','de','es','fr','it','nl','pl','pt','sk','uk']
assert.deepEqual(Object.keys(source).sort(), [...locales].sort())
const keys = Object.keys(source.en).sort()
for (const locale of locales) {
  assert.deepEqual(Object.keys(source[locale]).sort(), keys, `${locale}: missing source keys`)
  assert.ok(Object.values(source[locale]).every(value => typeof value === 'string' && value.trim()), `${locale}: empty entry`)
  const catalog = JSON.parse(fs.readFileSync(new URL(`../../src/l10n/${locale}.json`, import.meta.url), 'utf8'))
  assert.deepEqual(catalog.translations, source[locale], `${locale}: runtime/source mismatch`)
  assert.ok(fs.readFileSync(new URL(`../../src/l10n/${locale}.js`, import.meta.url), 'utf8').includes('OC.L10N.register("hc_shared_app_core_playground"'))
}
console.log(`Language catalogs: ${locales.length} locales, ${keys.length} keys per locale — PASS`)
