<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
interface Watch { checkNow(): Promise<boolean>; setRevision(revision: number): void; destroy(): void }
interface Concurrency {
 withExpectedRevision(payload: {content: string}, revision: number): {content: string; expectedRevision: number}
 isConflict(error: unknown): boolean
 mergeText(base: string, local: string, remote: string): {status: string; text: string}
 resolveConflict(options: {title: string; message: string; reloadLabel: string; keepEditingLabel: string; compareLabel: string; saveCopyLabel: string}): Promise<string>
 watchRevision(options: {initialRevision: number; loadRevision: () => Promise<number>; onChange: () => void}): Watch
}
const api = (): Concurrency | undefined => (window.HcSharedAppCore as unknown as {concurrency?: Concurrency})?.concurrency
const remote=ref({content:'První řádek\nDruhý řádek\nTřetí řádek',revision:1})
const editors=ref([0,1].map(()=>({content:remote.value.content,base:remote.value.content,revision:1})))
const message=ref('Načtěte oba editory, uložte změnu v A a zkuste uložit starou revizi z B.')
const copies=ref<string[]>([]),watched=ref('Sledování čeká na Core.');let watcher:Watch|undefined
function reload(index:number){editors.value[index]={content:remote.value.content,base:remote.value.content,revision:remote.value.revision}}
function reset(){remote.value={content:'První řádek\nDruhý řádek\nTřetí řádek',revision:1};reload(0);reload(1);copies.value=[];watcher?.setRevision(1);message.value='Testovací dokument byl resetován.'}
async function save(index:number){
 const core=api();if(!core){message.value='Je nutné Core s concurrency API.';return}
 const editor=editors.value[index];if(!editor)return;const payload=core.withExpectedRevision({content:editor.content},editor.revision)
 // Synchronous in-memory compare-and-swap simulation, not a server/file lock.
 const error=payload.expectedRevision!==remote.value.revision?{status:409}:null
 if(!error){remote.value={content:payload.content,revision:remote.value.revision+1};reload(index);message.value='Uloženo; revize '+remote.value.revision;await watcher?.checkNow();return}
 if(!core.isConflict(error)){message.value='Neočekávaná chyba.';return}
 message.value='HTTP 409 (simulace): zastaralá revize nebyla uložena.'
 const choice=await core.resolveConflict({title:'Konflikt testovacího dokumentu',message:'Druhý editor mezitím uložil jinou revizi.',reloadLabel:'Načíst vzdálenou verzi',keepEditingLabel:'Pokračovat v úpravách',compareLabel:'Porovnat / sloučit',saveCopyLabel:'Uložit testovací kopii'})
 if(choice==='reload')reload(index)
 if(choice==='save-copy'){copies.value.push(editor.content);message.value='Testovací kopie zachována pouze v paměti.'}
 if(choice==='compare'){
  const merged=core.mergeText(editor.base,editor.content,remote.value.content)
  if(merged.status==='conflict'){message.value='Změny se překrývají; obsah zůstává zachován. Porovnejte editory s uloženou verzí.';return}
  editor.base=remote.value.content;editor.revision=remote.value.revision;editor.content=merged.text
  message.value='Sloučeno do editoru; zkontrolujte text a znovu uložte.'
 }
}
onMounted(()=>{
 const core=api();if(!core){watched.value='Concurrency API není dostupné.';return}
 watcher=core.watchRevision({initialRevision:remote.value.revision,loadRevision:async()=>remote.value.revision,onChange:()=>{watched.value='Zjištěna nová revize '+remote.value.revision+'; rozepsané editory nebyly přepsány.'}})
 watched.value='Sledování revize aktivní.'
})
onBeforeUnmount(()=>watcher?.destroy())
</script>
<template>
 <section class="settings-demo">
  <h2>Souběžné změny · revize a konflikty</h2>
  <p>Ukázka skutečného Core concurrency API nad dokumentem v paměti. Nezamyká soubory ani nezapisuje na server; HTTP 409 a atomický zápis simuluje. Obnovením stránky se data smažou.</p>
  <div style="display:flex;flex-wrap:wrap;gap:16px">
   <article v-for="(editor,index) in editors" :key="index" style="flex:1;min-width:220px">
    <h3>Editor {{ index===0?'A':'B' }} · revize {{ editor.revision }}</h3>
    <textarea v-model="editor.content" :aria-label="'Editor '+(index===0?'A':'B')" rows="6" style="width:100%" />
    <button type="button" @click="save(index)">Uložit {{ index===0?'A':'B' }}</button>
    <button type="button" @click="reload(index)">Načíst uloženou verzi</button>
   </article>
  </div>
  <p role="status">{{ message }}</p><p>{{ watched }}</p>
  <h3>Uložená verze · revize {{ remote.revision }}</h3><pre>{{ remote.content }}</pre>
  <details v-if="copies.length"><summary>Testovací kopie</summary><pre v-for="(copy,i) in copies" :key="i">{{ copy }}</pre></details>
  <button type="button" @click="reset">Reset testu</button>
 </section>
</template>
