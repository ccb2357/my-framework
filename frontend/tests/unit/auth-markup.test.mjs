// @vitest-environment jsdom
import { test, expect, vi } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import Framework7 from 'framework7/lite-bundle';
import Framework7Vue from 'framework7-vue';
import { f7Page, f7Navbar, f7Block, f7List, f7ListInput, f7Button, f7Link } from 'framework7-vue';
vi.mock('../../src/pwa/index.js', () => ({ pwa: { draftGuard: () => () => {} } }));
import Access from '../../src/pages/access.vue';
import ClientAccess from '../../src/components/ClientAccess.vue';
import Account from '../../src/pages/account.vue';
import { clientState } from '../../src/services/session.js';
test('official Framework7 fields render distinct login/register IDs and password autocomplete without email verification', async () => {
  Framework7.use(Framework7Vue);
  const markup = [];
  for (const registration of [false, true]) {
    const app = createSSRApp(Access, { registration });
    for (const [name, component] of Object.entries({ f7Page, f7Navbar, f7Block, f7List, f7ListInput, f7Button, f7Link })) app.component(name, component);
    const html = await renderToString(app), wrapper = document.createElement('div'); wrapper.innerHTML = html;
    markup.push(wrapper);
    const password = wrapper.querySelector('input[name="password"]');
    expect(password.type).toBe('password');
    expect(password.autocomplete).toBe(registration ? 'new-password' : 'current-password');
    expect(wrapper.querySelectorAll('input')).toHaveLength(registration ? 4 : 2);
    expect(wrapper.querySelector('form').hasAttribute('novalidate')).toBe(true);
    expect(wrapper.querySelector('button[type="submit"]')).not.toBeNull();
    expect(wrapper.querySelector('a[href="/"]')).not.toBeNull();
    expect(wrapper.querySelector('div[data-errors="password"]')).not.toBeNull();
    if (registration) expect(wrapper.textContent).toContain('Não é necessário confirmar o e-mail');
  }
  expect(markup[0].querySelector('input').id).not.toBe(markup[1].querySelector('input').id);
});

test('official Framework7 account navigation renders real href anchors for guests and clients', async () => {
  Framework7.use(Framework7Vue);
  const render = async component => {
    const app = createSSRApp(component);
    for (const [name, control] of Object.entries({ f7Page, f7Navbar, f7Block, f7Button })) app.component(name, control);
    const wrapper = document.createElement('div'); wrapper.innerHTML = await renderToString(app); return wrapper;
  };
  clientState.user = null;
  const guest = await render(ClientAccess);
  expect(guest.querySelector('a[href="/entrar/"]')?.textContent).toBe('Entrar');
  expect(guest.querySelector('a[href="/cadastro/"]')?.textContent).toBe('Criar conta');
  clientState.user = { id: 1, name: 'Cliente', email: 'client@example.test' };
  const signed = await render(ClientAccess);
  expect(signed.querySelector('a[href="/conta/"]')).not.toBeNull();
  const account = await render(Account);
  expect(account.querySelector('a[href="/"]')).not.toBeNull();
  expect([...account.querySelectorAll('button')].some(button => button.textContent === 'Sair da conta')).toBe(true);
  clientState.user = null;
});
