import { test, expect, vi, afterEach } from 'vitest';
import { createApp, h, Suspense, ref, nextTick } from 'vue';
import DynamicContent from '../../app/components/DynamicContent.vue';
let dispose;
afterEach(()=>{dispose?.();dispose=undefined;vi.unstubAllGlobals();document.body.innerHTML='';});
const item={title:'Published title',body:'Public text',updatedAt:'2026-11-19T12:00:00Z'};
async function mountContent(value={data:item}) {
 const data=ref(value),status=ref('success'),error=ref(null);let finish;
 const clear=vi.fn(()=>{data.value=null;error.value=null;status.value='idle';});
 const refresh=vi.fn(()=>{status.value='pending';return new Promise(resolve=>{finish=next=>{if(next instanceof Error){error.value=next;status.value='error';}else{data.value=next;status.value='success';}resolve();};});});
 vi.stubGlobal('useFetch',vi.fn().mockResolvedValue({data,status,error,refresh,clear}));
 const host=document.createElement('div');document.body.append(host);const app=createApp({render:()=>h(Suspense,null,{default:()=>h(DynamicContent)})});app.mount(host);dispose=()=>app.unmount();
 await vi.waitFor(()=>expect(host.querySelector('h2')).not.toBeNull());
 return {host,data,status,error,refresh,clear,finish:next=>finish(next)};
}
test('dynamic card shows empty and safe text, uses hydration-only payload, and refreshes without old data',async()=>{
 const f=await mountContent({data:null});expect(f.host.textContent).toContain('Nenhum conteúdo publicado.');
 const options=useFetch.mock.calls[0][1];expect(options.cache).toBe('no-store');expect(options.credentials).toBe('omit');expect(options.retry).toBe(0);
 expect(options.getCachedData('k',{isHydrating:true,payload:{data:{k:'SSR'}}})).toBe('SSR');expect(options.getCachedData('k',{isHydrating:false,payload:{data:{k:'OLD'}}})).toBeUndefined();
 f.data.value={data:item};await nextTick();expect(f.host.textContent).toContain(item.title);
 f.host.querySelector('button').click();await nextTick();expect(f.refresh).toHaveBeenCalledOnce();expect(f.host.textContent).toContain('Carregando conteúdo');expect(f.host.textContent).not.toContain(item.title);expect(f.host.querySelector('button').disabled).toBe(true);
 f.finish({data:{...item,title:'<img src=x onerror=alert(1)>'}});await nextTick();expect(f.host.querySelector('img')).toBeNull();expect(f.host.textContent).toContain('<img src=x');
});
test('failure and offline hide previously loaded content, reconnect refreshes and unmount removes listeners',async()=>{
 const f=await mountContent();expect(f.host.textContent).toContain(item.title);
 window.dispatchEvent(new Event('offline'));await nextTick();expect(f.host.textContent).toContain('Sem conexão');expect(f.host.textContent).not.toContain(item.title);expect(f.host.querySelector('button').disabled).toBe(true);
 window.dispatchEvent(new Event('online'));await nextTick();expect(f.refresh).toHaveBeenCalledOnce();f.finish(new Error('PRIVATE'));await nextTick();expect(f.host.textContent).toContain('Não foi possível carregar');expect(f.host.textContent).not.toContain('PRIVATE');
 dispose();dispose=undefined;window.dispatchEvent(new Event('focus'));expect(f.refresh).toHaveBeenCalledOnce();
});
