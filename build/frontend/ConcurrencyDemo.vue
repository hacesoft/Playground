<script setup lang="ts">
import { t } from './i18n'

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
const remote=ref({content:t("First line\nSecond line\nThird line"),revision:1})
const editors=ref([0,1].map(()=>({content:remote.value.content,base:remote.value.content,revision:1})))
const message=ref(t("Load both editors, save a change in A and try to save the old revision from B."))
const copies=ref<string[]>([]),watched=ref(t("Watching is waiting for Core."));let watcher:Watch|undefined
function reload(index:number){editors.value[index]={content:remote.value.content,base:remote.value.content,revision:remote.value.revision}}
function reset(){remote.value={content:t("First line\nSecond line\nThird line"),revision:1};reload(0);reload(1);copies.value=[];watcher?.setRevision(1);message.value=t("Test document reset.")}
async function save(index:number){
 const core=api();if(!core){message.value=t("Core with concurrency API is required.");return}
 const editor=editors.value[index];if(!editor)return;const payload=core.withExpectedRevision({content:editor.content},editor.revision)
 // Synchronous in-memory compare-and-swap simulation, not a server/file lock.
 const error=payload.expectedRevision!==remote.value.revision?{status:409}:null
 if(!error){remote.value={content:payload.content,revision:remote.value.revision+1};reload(index);message.value=t("Saved; revision ")+remote.value.revision;await watcher?.checkNow();return}
 if(!core.isConflict(error)){message.value=t("Unexpected error.");return}
 message.value=t("HTTP 409 (simulation): the stale revision was not saved.")
 const choice=await core.resolveConflict({title:t("Test document conflict"),message:t("The other editor has saved another revision."),reloadLabel:t("Load remote version"),keepEditingLabel:t("Keep editing"),compareLabel:t("Compare / merge"),saveCopyLabel:t("Save test copy")})
 if(choice==='reload')reload(index)
 if(choice==='save-copy'){copies.value.push(editor.content);message.value=t("Test copy preserved in memory only.")}
 if(choice==='compare'){
  const merged=core.mergeText(editor.base,editor.content,remote.value.content)
  if(merged.status==='conflict'){message.value=t("Changes overlap; content is preserved. Compare the editors with the saved version.");return}
  editor.base=remote.value.content;editor.revision=remote.value.revision;editor.content=merged.text
  message.value=t("Merged into the editor; review the text and save again.")
 }
}
onMounted(()=>{
 const core=api();if(!core){watched.value=t("Concurrency API is unavailable.");return}
 watcher=core.watchRevision({initialRevision:remote.value.revision,loadRevision:async()=>remote.value.revision,onChange:()=>{watched.value=t("New revision detected ")+remote.value.revision+t("; unsaved edits were not overwritten.")}})
 watched.value=t("Revision watching active.")
})
onBeforeUnmount(()=>watcher?.destroy())
</script>
<template>
 <section class="settings-demo">
  <h2>{{ t("Concurrent changes · revisions and conflicts") }}</h2>
  <p>{{ t("Real Core concurrency API demo using an in-memory document. It does not lock files or write to the server; it simulates HTTP 409 and atomic writes. Reloading clears the data.") }}</p>
  <div style="display:flex;flex-wrap:wrap;gap:16px">
   <article v-for="(editor,index) in editors" :key="index" style="flex:1;min-width:220px">
    <h3>{{ t("Editor") }} {{ index===0?'A':'B' }} {{ t("· revision") }} {{ editor.revision }}</h3>
    <textarea v-model="editor.content" :aria-label="'Editor '+(index===0?'A':'B')" rows="6" style="width:100%" />
    <button type="button" @click="save(index)">{{ t("Save") }} {{ index===0?'A':'B' }}</button>
    <button type="button" @click="reload(index)">{{ t("Load saved version") }}</button>
   </article>
  </div>
  <p role="status">{{ message }}</p><p>{{ watched }}</p>
  <h3>{{ t("Saved version · revision") }} {{ remote.revision }}</h3><pre>{{ remote.content }}</pre>
  <details v-if="copies.length"><summary>{{ t("Test copies") }}</summary><pre v-for="(copy,i) in copies" :key="i">{{ copy }}</pre></details>
  <button type="button" @click="reset">{{ t("Reset test") }}</button>
 </section>
</template>
