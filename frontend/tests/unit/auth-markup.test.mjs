// @vitest-environment jsdom
import { test, expect, vi } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import Framework7 from 'framework7/lite-bundle';
import Framework7Vue from 'framework7-vue';
import { f7Page, f7Navbar, f7Block, f7List, f7ListInput, f7Button, f7Link } from 'framework7-vue';
vi.mock('../../src/pwa/index.js', () => ({ pwa: { draftGuard: () => () => {} } }));
import Access from '../../src/pages/access.vue';
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
    expect(wrapper.querySelector('div[data-errors="password"]')).not.toBeNull();
    if (registration) expect(wrapper.textContent).toContain('Não é necessário confirmar o e-mail');
  }
  expect(markup[0].querySelector('input').id).not.toBe(markup[1].querySelector('input').id);
});
