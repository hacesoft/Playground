// Validate shipped metadata, not a hand-written DOM fixture.
import fs from 'node:fs'
import assert from 'node:assert/strict'
export const manifest = JSON.parse(fs.readFileSync(new URL('../../src/appinfo/hc_shared_app_core.json', import.meta.url), 'utf8'))
export function validate(value) {
 assert.equal(value.contract, 'hc-shared-app-core-v1')
 assert.equal(value.requiredApiVersion, 1, 'Manifest must explicitly declare numeric requiredApiVersion: 1')
 assert.match(value.requiredVersion, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/)
}
// Prevent accidental fallback to API 0 and acceptance of malformed API values.
for (const requiredApiVersion of [undefined, 0, '1', 2]) assert.throws(() => validate({...manifest, requiredApiVersion}))
validate(manifest)
const controller=fs.readFileSync(new URL('../../src/lib/Controller/PageController.php',import.meta.url),'utf8')
const template=fs.readFileSync(new URL('../../src/templates/main.php',import.meta.url),'utf8')
assert.ok(controller.includes("'requiredCoreApiVersion' => (int)($contract['requiredApiVersion']"))
assert.ok(template.includes(`data-required-core-api-version="<?php p($_['requiredCoreApiVersion']); ?>"`))
console.log('Shipped manifest and PHP/template API binding: PASS')
