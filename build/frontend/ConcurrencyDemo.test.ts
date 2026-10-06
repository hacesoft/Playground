// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Demo from './ConcurrencyDemo.vue'
const conflict=vi.fn(async()=> 'keep-editing')
beforeEach(()=>{
 conflict.mockResolvedValue('keep-editing')
 ;(window as unknown as {HcSharedAppCore: unknown}).HcSharedAppCore={concurrency:{
  withExpectedRevision:(p:object,r:number)=>({...p,expectedRevision:r}),isConflict:(e:{status:number})=>e.status===409,
  resolveConflict:conflict,mergeText:()=>({status:'conflict',text:''}),
  watchRevision:()=>({checkNow:async()=>true,setRevision:()=>{},destroy:()=>{}})
 }}
})
describe('concurrent edit demo',()=>{
 it('rejects a stale second editor without overwriting the saved version or its draft',async()=>{
  const wrapper=mount(Demo),texts=wrapper.findAll('textarea')
  await texts[0]!.setValue('Saved A');await texts[1]!.setValue('Unsaved B')
  await wrapper.findAll('button')[0]!.trigger('click');await wrapper.findAll('button')[2]!.trigger('click')
  expect(conflict).toHaveBeenCalledOnce();expect(wrapper.find('pre').text()).toBe('Saved A')
  expect((texts[1]!.element as HTMLTextAreaElement).value).toBe('Unsaved B');wrapper.unmount()
 })
 it('preserves a conflicting draft as a test copy without overwriting the document',async()=>{
  conflict.mockResolvedValue('save-copy')
  const wrapper=mount(Demo),texts=wrapper.findAll('textarea')
  await texts[0]!.setValue('Saved A');await texts[1]!.setValue('Copy B')
  await wrapper.findAll('button')[0]!.trigger('click');await wrapper.findAll('button')[2]!.trigger('click')
  await Promise.resolve();await wrapper.vm.$nextTick()
  expect(wrapper.find('pre').text()).toBe('Saved A');expect(wrapper.find('details pre').text()).toBe('Copy B');wrapper.unmount()
 })
})
