// @vitest-environment jsdom
import { test, expect, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import Framework7 from 'framework7/lite-bundle';
import Framework7Vue, { f7Page, f7Navbar, f7List, f7ListInput, f7Block, f7Button } from 'framework7-vue';
import { readRecoveryLink, createRecovery } from '@shared/forms/recovery.js';
import { messages } from '@shared/forms/rules.js';
vi.mock('../../src/pwa/index.js',()=>({pwa:{draftGuard:()=>()=>{}}}));
vi.mock('../../src/services/api.js',()=>({apiRequest:vi.fn()}));
import Recovery from '../../src/pages/recovery.vue';
import { apiRequest } from '../../src/services/api.js';
test('link token is removed from history and never sent by forgot flow or persisted',async()=>{
 const history={state:{},replaceState:vi.fn()};const token='a'.repeat(64);
 const link=readRecoveryLink({hash:'#token='+token+'&email=x%40example.test',pathname:'/redefinir-senha/',search:''},history);
 expect(link).toEqual({token,email:'x@example.test'});expect(history.replaceState).toHaveBeenCalledWith({},'', '/redefinir-senha/');
 const state={}, request=vi.fn().mockResolvedValue({});const c=createRecovery(request,state,false);state.email='x@example.test';state.password='secret';await c.submit();
 expect(request).toHaveBeenCalledWith('forgot-password',{email:'x@example.test'});expect(state.message).toBe(messages.recoverySent);expect(state.password).toBe('');
});
test('reset requires a valid link, submits whitelist, clears secrets and reports expired link',async()=>{
 const state={},request=vi.fn().mockRejectedValueOnce({status:422}).mockResolvedValueOnce({});const token='a'.repeat(64);const c=createRecovery(request,state,true,{email:'x@example.test',token});
 state.password='Secret123!';state.password_confirmation='Secret123!';await c.submit();expect(state.message).toBe(messages.resetInvalid);expect(c.dirty()).toBe(true);
 await c.submit();expect(state.message).toBe(messages.resetDone);expect(state.password).toBe('');expect(c.dirty()).toBe(false);c.destroy();expect(state.password_confirmation).toBe('');
 const other=createRecovery(request,{},true);await other.submit();expect(request).toHaveBeenCalledTimes(2);
});
test('Framework7 recovery form displays empty-field errors under the official input and does not send mail',async()=>{
 Framework7.use(Framework7Vue);const target=document.createElement('div');document.body.append(target);const app=createApp(Recovery);
 for(const [name,c] of Object.entries({f7Page,f7Navbar,f7List,f7ListInput,f7Block,f7Button}))app.component(name,c);
 app.mount(target);await nextTick();target.querySelector('button[type="submit"]').click();await vi.waitFor(()=>expect(target.textContent).toContain(messages.emailRequired));
 expect(target.querySelector('.item-input-wrap [data-errors="email"]')).not.toBeNull();expect(apiRequest).not.toHaveBeenCalled();app.unmount();target.remove();
});

test('real reset form removes token from URL, validates confirmation and submits without exposing token in DOM',async()=>{
 vi.clearAllMocks();apiRequest.mockResolvedValue({});const token='b'.repeat(64);window.history.replaceState({},'', '/redefinir-senha/#token='+token+'&email=x%40example.test');
 const target=document.createElement('div');document.body.append(target);const app=createApp(Recovery,{reset:true});
 for(const [name,c] of Object.entries({f7Page,f7Navbar,f7List,f7ListInput,f7Block,f7Button}))app.component(name,c);
 app.mount(target);await nextTick();expect(window.location.hash).toBe('');expect(target.innerHTML).not.toContain(token);
 const fill=(name,value)=>{const el=target.querySelector(`[name="${name}"]`);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));};
 fill('password','Secret123!');fill('password_confirmation','Wrong123!');await nextTick();target.querySelector('button[type="submit"]').click();
 await vi.waitFor(()=>expect(target.textContent).toContain(messages.confirmationMismatch));expect(apiRequest).not.toHaveBeenCalled();
 fill('password_confirmation','Secret123!');await nextTick();target.querySelector('button[type="submit"]').click();
 await vi.waitFor(()=>expect(target.textContent).toContain(messages.resetDone));expect(apiRequest).toHaveBeenCalledWith('/api/v1/auth/reset-password',{method:'POST',csrfRefresh:true,json:{email:'x@example.test',token,password:'Secret123!',password_confirmation:'Secret123!'}});
 app.unmount();target.remove();window.history.replaceState({},'', '/');
});
