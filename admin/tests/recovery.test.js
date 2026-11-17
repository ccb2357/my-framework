// @vitest-environment jsdom
import { test, expect, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
vi.mock('../src/services/auth',()=>({adminRequest:vi.fn()}));
import Recovery from '../src/pages/Recovery.vue';
import { adminRequest } from '../src/services/auth';
import { messages } from '@shared/forms/rules.js';
test('shadcn recovery uses shared validation under its own inputs and sends only email',async()=>{
 adminRequest.mockResolvedValue({});const target=document.createElement('div');document.body.append(target);const app=createApp(Recovery);app.mount(target);await nextTick();
 target.querySelector('button[type="submit"]').click();await vi.waitFor(()=>expect(target.textContent).toContain(messages.emailRequired));expect(adminRequest).not.toHaveBeenCalled();
 const input=target.querySelector('[name="email"]');input.value='admin@example.test';input.dispatchEvent(new Event('input',{bubbles:true}));await nextTick();target.querySelector('button[type="submit"]').click();
 await vi.waitFor(()=>expect(target.textContent).toContain(messages.recoverySent));expect(adminRequest).toHaveBeenCalledWith('forgot-password',{method:'POST',json:{email:'admin@example.test'}});app.unmount();target.remove();
});

test('admin reset form consumes the email fragment and validates new password confirmation',async()=>{
 vi.clearAllMocks();adminRequest.mockResolvedValue({});const token='c'.repeat(64);window.history.replaceState({},'', '/redefinir-senha/#token='+token+'&email=admin%40example.test');
 const target=document.createElement('div');document.body.append(target);const app=createApp(Recovery,{reset:true});app.mount(target);await nextTick();expect(window.location.hash).toBe('');expect(target.innerHTML).not.toContain(token);
 const fill=(name,value)=>{const input=target.querySelector(`[name="${name}"]`);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));};
 fill('password','Secret123!');fill('password_confirmation','Wrong123!');await nextTick();target.querySelector('button[type="submit"]').click();
 await vi.waitFor(()=>expect(target.textContent).toContain(messages.confirmationMismatch));expect(adminRequest).not.toHaveBeenCalled();
 fill('password_confirmation','Secret123!');await nextTick();target.querySelector('button[type="submit"]').click();await vi.waitFor(()=>expect(target.textContent).toContain(messages.resetDone));
 expect(adminRequest).toHaveBeenCalledWith('reset-password',{method:'POST',json:{email:'admin@example.test',token,password:'Secret123!',password_confirmation:'Secret123!'}});app.unmount();target.remove();window.history.replaceState({},'', '/');
});
