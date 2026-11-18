// @vitest-environment jsdom
import { test, expect, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import Framework7 from 'framework7/lite-bundle';
import Framework7Vue, { f7Page, f7Navbar, f7Block, f7List, f7ListInput, f7Button, f7Link } from 'framework7-vue';
vi.mock('../../src/pwa/index.js', () => ({ pwa: { draftGuard: vi.fn(() => () => {}) } }));
vi.mock('../../src/services/session.js', () => ({ clientAuth: { register: vi.fn(), login: vi.fn() } }));
import Access from '../../src/pages/access.vue';
import { clientAuth } from '../../src/services/session.js';
import { messages } from '@shared/forms/rules.js';
test('empty registration displays all validation messages when the real Framework7 submit button is clicked', async () => {
 Framework7.use(Framework7Vue);
 const target = document.createElement('div'); document.body.append(target);
 const app = createApp(Access, { registration: true });
 for (const [name, component] of Object.entries({ f7Page, f7Navbar, f7Block, f7List, f7ListInput, f7Button, f7Link })) app.component(name, component);
 app.mount(target); await nextTick();
 target.querySelector('button[type="submit"]').click();
 await vi.waitFor(() => {
  for (const message of [messages.nameRequired, messages.emailRequired, messages.passwordRequired, messages.confirmationRequired]) expect(target.textContent).toContain(message);
 });
 for (const name of ['name', 'email', 'password', 'password_confirmation']) {
  const input = target.querySelector(`[name="${name}"]`);
  expect(input.closest('.item-input-wrap').querySelector(`[data-errors="${name}"] .just-validate-error-label`)).not.toBeNull();
  expect(input.getAttribute('aria-invalid')).toBe('true');
 }
 expect(clientAuth.register).not.toHaveBeenCalled();
 app.unmount(); target.remove();
});

test('direct Framework7 router registration initializes validation after routing the page', async () => {
 const { h } = await import('vue');
 const { f7App, f7View } = await import('framework7-vue');
 window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
 const target = document.createElement('div'); document.body.append(target);
 const root = { render: () => h(f7App, { theme: 'md', routes: [{ path: '/cadastro/', asyncComponent: () => Promise.resolve(Access), options: { props: { registration: true } } }] }, { default: () => h(f7View, { main: true, url: '/cadastro/', animate: false }) }) };
 const app = createApp(root);
 for (const [name, component] of Object.entries({ f7Page, f7Navbar, f7Block, f7List, f7ListInput, f7Button, f7Link })) app.component(name, component);
 app.mount(target);
 await vi.waitFor(() => expect(target.querySelector('input[name="name"]')).not.toBeNull());
 target.querySelector('button[type="submit"]').click();
 await vi.waitFor(() => expect(target.textContent).toContain(messages.nameRequired));
 app.unmount(); target.remove();
});
