// @vitest-environment jsdom
import {mount,flushPromises} from '@vue/test-utils'
import {describe,it,expect,vi} from 'vitest'
import RuntimeChecks from './RuntimeChecks.vue'
describe('manual runtime probes',()=>{
 it('does not download tiles, request GPS or write on mount',()=>{
 const fetcher=vi.spyOn(globalThis,'fetch');const w=mount(RuntimeChecks,{props:{settingsUrl:'/settings'}})
 expect(fetcher).not.toHaveBeenCalled();expect(w.text()).toContain('Dosud netestováno');w.unmount();fetcher.mockRestore()
 })
 it('cleans only its own favorite after update failure and empties isolated settings',async()=>{
 const save=vi.fn().mockResolvedValue({}),remove=vi.fn().mockResolvedValue(undefined)
 let token='';save.mockImplementation(async(v)=>{token=v.probe??'';return v})
 const create=vi.fn((_endpoint:string,_namespace:string)=>({save,load:async()=>token?{probe:token}:{}}))
 window.HcSharedAppCore={settings:{create},maps:{favorites:{add:async()=>({id:'owned-probe'}),update:async()=>{throw Error('update failed')},remove,list:async()=>[{id:'real-user-favorite'}]}}} as unknown as NonNullable<Window['HcSharedAppCore']>
 const w=mount(RuntimeChecks,{props:{settingsUrl:'/settings'}})
 await w.findAll('button').find(b=>b.text().includes('ukládání'))!.trigger('click');await flushPromises()
 expect(create.mock.calls[0]?.[1]).toMatch(/^hc_pg_probe_/)
 expect(remove).toHaveBeenCalledExactlyOnceWith('owned-probe');expect(save).toHaveBeenLastCalledWith({});expect(w.text()).toContain('update failed');w.unmount()
 })
})
