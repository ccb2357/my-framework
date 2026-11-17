// @vitest-environment jsdom
import { test, expect, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import { adminRequest, createAdminAuth, AdminApiError } from '../src/services/auth';
import Login from '../src/pages/Login.vue';
import { adminAuth } from '../src/services/session';
import { messages } from '@shared/forms/rules.js';
test('real shadcn login button validates empty fields without calling server and clears credentials on removal', async () => {
 const spy = vi.spyOn(adminAuth,'login'); const target=document.createElement('div');document.body.append(target);
 const app=createApp(Login);app.mount(target);await nextTick();
 target.querySelector('button[type="submit"]').click();
 await vi.waitFor(()=>expect(target.textContent).toContain(messages.emailRequired));
 expect(target.textContent).toContain(messages.passwordRequired);expect(spy).not.toHaveBeenCalled();
 expect(target.querySelector('[name="password"]').getAttribute('aria-invalid')).toBe('true');
 app.unmount();target.remove();spy.mockRestore();
});
test('HTTP adapter reads only admin CSRF cookie and sanitizes error bodies', async () => {
 document.cookie='XSRF-TOKEN=client-secret';document.cookie='XSRF-ADMIN-TOKEN=admin-token';
 const fetcher=vi.fn().mockResolvedValueOnce(new Response(null,{status:204})).mockResolvedValueOnce(new Response(JSON.stringify({message:'PRIVATE',errors:{email:['Inválido'],trace:['PRIVATE']}}),{status:422,headers:{'content-type':'application/json'}}));
 await expect(adminRequest('login',{method:'POST',json:{email:'x',password:'secret'},fetcher})).rejects.toSatisfy(e=>e.status===422&&e.errors.email[0]==='Inválido'&&!JSON.stringify(e).includes('PRIVATE'));
 expect(fetcher.mock.calls[1][1].headers['X-XSRF-TOKEN']).toBe('admin-token');expect(fetcher.mock.calls[1][1].cache).toBe('no-store');
});
test('session identity is memory-only, whitelisted, and late reads cannot restore a logged out admin', async () => {
 const state={status:'unknown',user:null};let finish;
 const request=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce(null);
 const auth=createAdminAuth(state,request), pending=auth.check();await auth.logout();finish({user:{id:1,name:'Admin',email:'a@example.test',password:'PRIVATE'}});await pending;
 expect(state.user).toBeNull();expect(state.status).toBe('guest');
 const req=vi.fn().mockResolvedValue({user:{id:1,name:'Admin',email:'a@example.test',password:'PRIVATE'}});
 await createAdminAuth(state,req).login({email:'a',password:'x',role:'admin'});
 expect(req.mock.calls[0][1].json).toEqual({email:'a',password:'x'});expect(state.user).not.toHaveProperty('password');
});
test('guest and network failures have distinct UI states and failed logout is not reported complete',async()=>{
 const state={};const request=vi.fn().mockRejectedValueOnce(new AdminApiError(401)).mockRejectedValueOnce(new Error('network')).mockRejectedValueOnce(new Error('network'));
 const auth=createAdminAuth(state,request);expect(await auth.check()).toBeNull();expect(state.status).toBe('guest');
 await expect(auth.check()).rejects.toThrow();expect(state.status).toBe('unavailable');await expect(auth.logout()).rejects.toThrow();expect(state.status).toBe('unavailable');
});

test('administrative root never renders dashboard before session verification and reports rejected login', async () => {
 const { default: Root } = await import('../src/App.vue');
 const { adminState } = await import('../src/services/session');
 const check=vi.spyOn(adminAuth,'check').mockImplementation(async()=>{adminState.status='guest';adminState.user=null;});
 const login=vi.spyOn(adminAuth,'login').mockImplementation(async()=>{ adminState.status='authenticating'; await nextTick(); expect(target.querySelector('form')).not.toBeNull(); adminState.status='guest'; throw new AdminApiError(401); });
 adminState.status='unknown';adminState.user=null;
 const target=document.createElement('div');document.body.append(target);const app=createApp(Root);app.mount(target);
 await nextTick();expect(target.textContent).not.toContain('Hello Dashboard');
 const fill=(name,value)=>{const input=target.querySelector(`[name="${name}"]`);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));};
 fill('email','admin@example.test');fill('password','wrong123!');await nextTick();target.querySelector('button[type="submit"]').click();
 await vi.waitFor(()=>expect(target.textContent).toContain('E-mail ou senha inválidos'));
 expect(target.textContent).not.toContain('Hello Dashboard');
 app.unmount();target.remove();check.mockRestore();login.mockRestore();
});

for (const action of ['login', 'logout']) {
 test(`session reads and overlapping mutations cannot interfere with administrative ${action}`, async () => {
  let finish; const user={id:1,name:'Admin',email:'admin@example.test'},state={};
  const request=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue({user});
  const auth=createAdminAuth(state,request),operation=auth[action]({email:user.email,password:'Secret123!'});
  expect(await auth.check()).toBeNull();
  await expect(auth.login({})).rejects.toSatisfy(error=>error.status===409);
  await expect(auth.logout()).rejects.toSatisfy(error=>error.status===409);
  expect(request).toHaveBeenCalledTimes(1);expect(state.user).toBeNull();
  finish(action==='logout'?null:{user});await operation;
  expect(state.status).toBe(action==='logout'?'guest':'authenticated');
  await auth.check();expect(request).toHaveBeenCalledTimes(2);
 });
}
test('failed administrative login releases mutation lock for retry', async()=>{
 const state={},user={id:1,name:'Admin',email:'admin@example.test'};
 const auth=createAdminAuth(state,vi.fn().mockRejectedValueOnce(new AdminApiError(401)).mockResolvedValue({user}));
 await expect(auth.login({})).rejects.toThrow();expect(state.status).toBe('guest');
 await auth.login({});expect(state.user).toEqual(user);
});
