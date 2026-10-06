<script setup lang="ts">
import { t } from './i18n'

import { ref, nextTick, onBeforeUnmount } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
const props = defineProps<{settingsUrl:string}>()
interface Sample {point:MapPoint;accuracyM:number|null;timestamp:number}
interface Tracker {destroy():void}
interface Follow {enable():void;isEnabled():boolean;destroy():void}
interface LiveController extends MapController {notifyManualPan():void}
interface LiveMaps {
 adapters:{leaflet(map:L.Map):MapDriver}
 createTileLoader():{load(url:string,options:{signal:AbortSignal}):Promise<Blob>;destroy():void}
 watchLocation(options:{onPosition:(s:Sample)=>void;onError:(e:{code:string;message:string})=>void}):Tracker
 followLocation(map:MapController,tracker:Tracker,options:{keepZoom:boolean}):Follow
}
const host=ref<HTMLElement>(), canvas=ref<HTMLElement>(), running=ref(false), busy=ref(false), gps=ref(false), following=ref(false)
const message=ref(t("The map loads only when you press the button.")), probe=ref(t("Not tested yet.")), writing=ref(false), writeResult=ref(t("Not tested yet."))
const providers=ref<Array<{id:string;name:string;mapsets:string[];attribution?:string}>>([]), provider=ref(''), mapset=ref('')
let map:L.Map|undefined, controller:LiveController|undefined, loader:ReturnType<LiveMaps['createTileLoader']>|undefined, layer:L.GridLayer|undefined
let tracker:Tracker|undefined, follow:Follow|undefined, marker:L.CircleMarker|undefined, resize:LayoutController|undefined
let disposed=false, abort=new AbortController(), tileCancels=new Map<HTMLElement,AbortController>()
const pendingFavorite=ref('')
const core=()=>{const value=window.HcSharedAppCore;if(!value)throw Error(t("Core is not loaded."));return value}
const maps=()=>core().maps as NonNullable<Window['HcSharedAppCore']>['maps'] & LiveMaps
const errorText=(e:unknown)=>e instanceof Error?e.message:String(e)
function stopGps(){follow?.destroy();tracker?.destroy();follow=undefined;tracker=undefined;gps.value=false;following.value=false;marker?.remove();marker=undefined}
async function stop(){busy.value=true;stopGps();abort.abort();abort=new AbortController();tileCancels.forEach(c=>c.abort());tileCancels.clear();loader?.destroy();loader=undefined;resize?.destroy();resize=undefined;const old=controller;controller=undefined;const oldMap=map;map=undefined;running.value=false;try{await old?.destroy()}finally{oldMap?.remove();busy.value=false}}
function changeLayer(){
 if(!map||!loader)return
 tileCancels.forEach(c=>c.abort());tileCancels.clear();layer?.remove()
 const p=provider.value,m=mapset.value, tileLoader=loader
 // Core owns the request queue/retry policy. Unloaded tiles cancel obsolete work.
 const Tiles=L.GridLayer.extend({createTile(coords:L.Coords,done:L.DoneCallback){
  const tile=document.createElement('canvas');tile.width=tile.height=256
  const cancel=new AbortController();tileCancels.set(tile,cancel)
  tileLoader.load(core().maps.tileUrl(p,m,256,coords.z,coords.x,coords.y),{signal:cancel.signal})
   .then(blob=>createImageBitmap(blob)).then(bitmap=>{try{if(!cancel.signal.aborted){tile.getContext('2d')!.drawImage(bitmap,0,0,256,256);done(undefined,tile)}}finally{bitmap.close()}})
   .catch(e=>{if(!cancel.signal.aborted){message.value=t("Tile: ")+errorText(e);done(e,tile)}})
  return tile
 }})
 // Provider text is inserted as text, never as HTML in Leaflet attribution.
 const newLayer=new (Tiles as unknown as new (options:L.GridLayerOptions)=>L.GridLayer)({tileSize:256,minZoom:1,maxZoom:18,keepBuffer:1,updateWhenIdle:true})
 newLayer.on('tileunload',(e:L.TileEvent)=>{tileCancels.get(e.tile)?.abort();tileCancels.delete(e.tile)})
 newLayer.addTo(map);layer=newLayer
}
function providerChanged(){mapset.value=providers.value.find(p=>p.id===provider.value)?.mapsets[0]??'';changeLayer()}
async function start(){busy.value=true;try{
 const list=await core().maps.providers.list();if(disposed)return
 providers.value=list.filter(p=>p.enabled&&p.configured);if(!providers.value.length)throw Error(t("No available provider."))
 provider.value=providers.value[0]!.id;mapset.value=providers.value[0]!.mapsets[0]??'basic'
 running.value=true;await nextTick();if(disposed)return
 map=L.map(canvas.value!,{zoomControl:false,attributionControl:false}).setView([49.1478,16.5803],10)
 loader=maps().createTileLoader()
 controller=core().maps.mount(host.value!,{driver:maps().adapters.leaflet(map),controls:{zoom:true,home:true,gps:false,compass:false},compassOverlay:false}) as LiveController
 map.on('dragstart',()=>{controller?.notifyManualPan();following.value=follow?.isEnabled()??false})
 resize=core().layout.observe(host.value!,{onResize:()=>map?.invalidateSize()})
 running.value=true;changeLayer();message.value=t("The map uses the Core proxy. Pan and change the zoom.")
 }catch(e){message.value=errorText(e);await stop()}finally{busy.value=false}}
function startGps(){try{if(!map||!controller)return;stopGps();gps.value=true
 tracker=maps().watchLocation({onPosition:s=>{if(disposed||!map)return;marker??=L.circleMarker([s.point.lat,s.point.lon],{radius:7}).addTo(map);marker.setLatLng([s.point.lat,s.point.lon]);message.value=`GPS: ${s.point.lat.toFixed(5)}, ${s.point.lon.toFixed(5)}; ${t("Accuracy")} ${s.accuracyM??'?'} m`},onError:e=>{message.value=e.code+': '+e.message;if(e.code==='permission_denied'||e.code==='unsupported')stopGps()}})
 follow=maps().followLocation(controller,tracker,{keepZoom:true});following.value=follow.isEnabled()
 }catch(e){stopGps();message.value=errorText(e)}}
function recenter(){follow?.enable();following.value=follow?.isEnabled()??false}
const probing=ref(false)
async function testCache(){if(!map)return;probing.value=true;probe.value=t("Loading the same tile twice…");try{
 const z=map.getZoom(), point=map.project(map.getCenter(),z).divideBy(256).floor(),n=2**z
 const url=core().maps.tileUrl(provider.value,mapset.value,256,z,((point.x%n)+n)%n,Math.max(0,Math.min(n-1,point.y)))
 const results:string[]=[]
 for(let i=0;i<2;i++){
 const response=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(20000)])})
 if(!response.ok)throw Error(`HTTP ${response.status}; ${response.headers.get('X-HC-Core-Map-Error')??''}; Retry-After ${response.headers.get('Retry-After')??'—'}`)
 const image=await createImageBitmap(await response.blob());image.close();results.push(response.headers.get('X-HC-Core-Map-Cache')??t("not specified"))
 }
 probe.value=`1. ${results[0]}; 2. ${results[1]}. `+(results[1]==='hit'?t("Server cache HIT confirmed."):t("HIT not confirmed; result is not marked as successful."))
 }catch(e){probe.value=errorText(e)}finally{probing.value=false}}
async function cleanupFavorite(){if(pendingFavorite.value){await core().maps.favorites.remove(pendingFavorite.value);pendingFavorite.value=''}}
async function testWrites(){writing.value=true;writeResult.value=t("Checking writing, reading and cleanup…")
 const token=crypto.randomUUID().replaceAll('-',''),settings=core().settings.create(props.settingsUrl,'hc_pg_probe_'+token)
 let failure=''
 try{
 await settings.save({probe:token});if((await settings.load()).probe!==token)throw Error(t("Settings mismatch after loading."))
 const favorite=await core().maps.favorites.add({name:'Playground test '+token,lat:49.1478,lon:16.5803,sourceApp:'hc_shared_app_core_playground'})
 pendingFavorite.value=String(favorite.id??'');if(!pendingFavorite.value)throw Error(t("The response contains no favorite place ID."))
 const name='Playground updated '+token;await core().maps.favorites.update(pendingFavorite.value,{name})
 if(!(await core().maps.favorites.list()).some(f=>String(f.id)===pendingFavorite.value&&f.name===name))throw Error(t("Favorite place mismatch after updating."))
 }catch(e){failure=errorText(e)}finally{
 try{await settings.save({});if(Object.keys(await settings.load()).length)throw Error(t("Settings were not cleared."))}catch(e){failure+=t(" Settings cleanup ")+errorText(e)+'; namespace hc_pg_probe_'+token}
 try{const id=pendingFavorite.value;await cleanupFavorite();if(id&&(await core().maps.favorites.list()).some(f=>String(f.id)===id)){pendingFavorite.value=id;throw Error(t("The place still exists."))}}catch(e){failure+=t(" Place cleanup: ")+errorText(e)}
 writeResult.value=failure||t("Settings and favorite place: writing, reading, updating and cleanup verified.");writing.value=false
 }}
async function retryCleanup(){try{await cleanupFavorite();writeResult.value=t("Test place removed.")}catch(e){writeResult.value=errorText(e)}}
onBeforeUnmount(()=>{disposed=true;void stop();/* An in-flight write completes its own finally cleanup. */})
</script>
<template>
<section class="runtime-checks">
<h2>{{ t("Runtime tests on this server") }}</h2>
<p>{{ t("Start manually. The map loads tiles through Core and may use provider credits. Storage tests use only the signed-in user's own test data.") }}</p>
<button :disabled="running||busy" @click="start">{{ t("Start real map") }}</button>
<button :disabled="!running||busy" @click="stop">{{ t("Stop map and GPS") }}</button>
<template v-if="running"><label>{{ t("Provider") }} <select v-model="provider" @change="providerChanged"><option v-for="p in providers" :key="p.id" :value="p.id">{{p.name}}</option></select></label>
<label>{{ t("Map layer") }} <select v-model="mapset" @change="changeLayer"><option v-for="m in providers.find(p=>p.id===provider)?.mapsets" :key="m">{{m}}</option></select></label></template>
<div ref="host" class="live-map" v-show="running"><div ref="canvas" class="map-canvas"></div></div>
<p v-if="running">{{providers.find(p=>p.id===provider)?.attribution}}</p>
<button :disabled="!running||probing" @click="testCache">{{ t("Check server cache") }}</button>
<p role="status">{{probe}}</p>
<button :disabled="!running||gps" @click="startGps">{{ t("Start GPS") }}</button><button :disabled="!gps" @click="stopGps">{{ t("Stop GPS") }}</button><button :disabled="!gps" @click="recenter">{{ t("My location / follow") }}</button>
<p>{{ t("GPS following:") }} {{following?t("on"):t("off")}}{{ t(". Manual panning disables following; zoom preserves it. GPS is not saved to favorites; moving the map requests tiles.") }}</p><p role="status">{{message}}</p>
<button :disabled="writing||!!pendingFavorite" @click="testWrites">{{ t("Check storage and test data cleanup") }}</button><p role="status">{{writeResult}}</p>
<p v-if="pendingFavorite">{{ t("Test place ID:") }} {{pendingFavorite}} <button :disabled="writing" @click="retryCleanup">{{ t("Complete place cleanup") }}</button></p>
</section>
</template>
<style scoped>
.runtime-checks{padding:24px;margin:24px 0;border:1px solid var(--color-border);border-radius:12px;min-width:0}.runtime-checks button,.runtime-checks label{margin:4px}.runtime-checks p{margin:12px 0;overflow-wrap:anywhere}.live-map{height:420px;position:relative;isolation:isolate}.map-canvas{height:100%;width:100%}
</style>
