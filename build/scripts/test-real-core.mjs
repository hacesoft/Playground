// Exercise public bundles; HTTP fixtures do not qualify a Nextcloud server.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { manifest } from './test-manifest.mjs'
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'))
if (!process.argv[2]) throw Error('Pass the path to core/src/js/hc_shared_app_core.js')
const dom = new JSDOM(`<div id="hc_shared_app_core_playground" data-playground-version="${pkg.version}" data-required-core-version="${manifest.requiredVersion}" data-required-core-api-version="${manifest.requiredApiVersion}" data-core-status-url="/status" data-core-settings-url="/settings" data-core-sharees-url="/sharees" data-core-release-url="/release"></div>`, {url:'https://test.invalid/nc/',runScripts:'outside-only',pretendToBeVisual:true})
const w=dom.window
w.ResizeObserver=class {observe(){} disconnect(){}}
w.OC={generateUrl:s=>'/nc'+s,requestToken:'fixture'}
w.fetch=async input=>{
 const url=String(input)
 const payload=url.includes('/status')?{app:'hc_shared_app_core',version:'0.18.0-dev.3',apiVersion:1,contract:'hc-shared-app-core-v1',nextcloud:{min:35,max:35}}
 :url.includes('/providers')?{providers:[]}
 :url.includes('/diagnostics')?{requests:0,cacheHits:0,cacheMisses:0,externalRequests:0,savedExternalRequests:0,cacheBytes:0,cacheLimitBytes:536870912,cacheUsagePercent:0,cacheEntryCount:0,tileCacheTtlSeconds:31536000,browserCacheTtlSeconds:604800,canManage:true}
 :url.includes('/settings')?{values:{}}
 :url.includes('/release')?{available:false}:{items:[]}
 return {ok:true,status:200,json:async()=>payload}
}
try {
 w.eval(fs.readFileSync(process.argv[2],'utf8'))
 assert.equal(typeof w.HcSharedAppCore.editor.create,'function')
 assert.equal(typeof w.HcSharedAppCore.lists.list,'function')
 assert.equal(typeof w.HcSharedAppCore.background.create,'function')
 for (const name of ['createTileLoader','watchLocation','followLocation','mount','tileUrl']) assert.equal(typeof w.HcSharedAppCore.maps[name],'function',name)
 assert.equal(typeof w.HcSharedAppCore.maps.adapters.leaflet,'function')
 w.eval(fs.readFileSync(new URL('../../src/js/playground.js',import.meta.url),'utf8'))
 for(let n=0;n<100&&w.document.querySelectorAll('.test-card.passed').length<16;n++) await new Promise(r=>setTimeout(r,10))
 assert.equal(w.document.querySelectorAll('.test-card.passed').length,16,[...w.document.querySelectorAll('.test-card:not(.passed)')].map(e=>e.textContent).join('\n'))
 w.dispatchEvent(new w.PageTransitionEvent('pagehide',{persisted:true}))
 assert.equal(w.document.querySelectorAll('.test-card').length,16)
 w.dispatchEvent(new w.PageTransitionEvent('pagehide',{persisted:false}))
 assert.equal(w.document.querySelectorAll('.test-card').length,0)
 console.log('Playground + real Core: 16 public checks and BFCache PASS (mock HTTP)')
} finally {dom.window.close()}
