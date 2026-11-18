import { test, expect, vi, afterEach } from 'vitest';
import { createApp, nextTick } from 'vue';
import AuthForm from '../../app/components/ClientAuthForm.vue';
import RecoveryForm from '../../app/components/ClientRecoveryForm.vue';
import { initAuthForm } from '../../app/forms/auth.js';
import { createClientAuth } from '../../app/services/client-auth.js';
import { messages } from '@shared/forms/rules.js';
let dispose;
afterEach(() => { dispose?.(); dispose = undefined; vi.unstubAllGlobals(); document.body.innerHTML = ''; });
const submit = form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
test('website registration validates all shared rules before submitting and destroys its validator', async () => {
 document.body.innerHTML = '<form novalidate>' + ['name','email','password','password_confirmation'].map(name => `<input name="${name}"><div id="${name}-errors" data-errors="${name}"></div>`).join('') + '</form>';
 const form = document.querySelector('form'), success = vi.fn();
 dispose = await initAuthForm(form, true, success);
 submit(form); await vi.waitFor(() => expect(form.textContent).toContain(messages.emailRequired)); expect(success).not.toHaveBeenCalled();
 const values = {name:'Cliente',email:'cliente@example.test',password:'Client123!',password_confirmation:'different'};
 for (const [name,value] of Object.entries(values)) form.querySelector(`[name="${name}"]`).value = value;
 submit(form); await vi.waitFor(() => expect(form.textContent).toContain(messages.confirmationMismatch));
 form.querySelector('[name="password_confirmation"]').value = values.password; submit(form); await vi.waitFor(() => expect(success).toHaveBeenCalledOnce());
});
test('rendered website signup is disabled until ready and sends only the correct action once', async () => {
 const register = vi.fn().mockResolvedValue({ id:1 }), navigate = vi.fn();
 vi.stubGlobal('useClientSession', () => ({auth:{register}})); vi.stubGlobal('navigateTo', navigate);
 const host = document.createElement('div'); document.body.append(host); const app = createApp(AuthForm, {registration:true}); app.component('NuxtLink', { template:'<a><slot /></a>' }); app.mount(host); dispose = () => app.unmount();
 expect(host.querySelector('fieldset').disabled).toBe(true); await vi.waitFor(() => expect(host.querySelector('fieldset').disabled).toBe(false));
 const values = {name:'Cliente',email:'cliente@example.test',password:'Client123!',password_confirmation:'Client123!'};
 for (const [name,value] of Object.entries(values)) {const input=host.querySelector(`[name="${name}"]`);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}
 await nextTick(); submit(host.querySelector('form')); await vi.waitFor(() => expect(register).toHaveBeenCalledOnce()); expect(navigate).toHaveBeenCalledWith('/conta/',{replace:true});
 expect(host.querySelector('[name="password"]').value).toBe('');
});
test('recovery consumes and erases fragment on mount without submitting or serializing the token', async () => {
 const token = 'a'.repeat(64); window.history.replaceState({},'', '/redefinir-senha/#token='+token+'&email=cliente%40example.test');
 const network = vi.fn(); vi.stubGlobal('fetch',network);
 const host=document.createElement('div'); document.body.append(host); const app=createApp(RecoveryForm,{reset:true});app.component('NuxtLink',{template:'<a><slot /></a>'});app.mount(host);dispose=()=>app.unmount();
 await vi.waitFor(()=>expect(host.querySelector('fieldset').disabled).toBe(false));expect(window.location.hash).toBe('');expect(host.innerHTML).not.toContain(token);expect(network).not.toHaveBeenCalled();expect(host.querySelector('[name="email"]').value).toBe('cliente@example.test');
});
test('session controllers are isolated, clear stale identities and never retry writes after an expired CSRF', async () => {
 const first={status:'unknown',user:null}, second={status:'unknown',user:null};
 const auth=createClientAuth({state:first,request:vi.fn().mockResolvedValue({user:{id:1,name:'A',email:'a@example.test'}})});
 await auth.check();expect(first.user.id).toBe(1);expect(second.user).toBeNull();
 const request=vi.fn().mockRejectedValue({status:419});const other=createClientAuth({state:second,request});await expect(other.login({email:'b@example.test',password:'private'})).rejects.toMatchObject({status:419});expect(request).toHaveBeenCalledOnce();expect(second.user).toBeNull();
});
