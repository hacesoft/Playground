import { readFile } from 'node:fs/promises'

const bundle = await readFile(new URL('../../src/js/playground.js', import.meta.url), 'utf8')
const prefix = bundle.trimStart().slice(0, 160)

if (!prefix.startsWith('(function()') && !prefix.includes('HcSharedAppCorePlaygroundBundle')) {
  throw new Error('Playground bundle is not isolated in its IIFE namespace.')
}

if (/\bprocess\.env\b/.test(bundle)) {
  throw new Error('Playground bundle contains a Node.js process.env reference.')
}

console.log('Bundle isolation: OK')
