// @vitest-environment jsdom
import { test, expect, vi, afterEach } from 'vitest';
import IMask from 'imask';
import { initDemoForm } from '../../src/forms/demo.js';
import { mobileMaskOptions } from '@shared/forms/masks.js';
import { emailRules, mobileRules, messages } from '@shared/forms/rules.js';
let dispose;
afterEach(() => { dispose?.(); dispose = undefined; document.body.innerHTML = ''; });
function fixture() {
  document.body.innerHTML = '<form novalidate><div><label for="demo-email">E-mail</label><input id="demo-email" aria-describedby="email-help"><span id="email-help">Ajuda</span></div><div><label for="demo-phone">Celular</label><input id="demo-phone" type="text"></div><button type="submit">Validar</button></form>';
  const form = document.querySelector('form'), email = form.querySelector('#demo-email'), phone = form.querySelector('#demo-phone');
  const success = vi.fn();
  dispose = initDemoForm(form, success);
  return { form, email, phone, success, submit: () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) };
}
test('shared rules create independent state and require a complete numeric mobile', () => {
  const one = mobileMaskOptions(), two = mobileMaskOptions(); one.mask = '00';
  expect(two.mask).toBe('(00) 00000-0000');
  expect(emailRules()).not.toBe(emailRules());
  let digits = '1199999999'; const rule = mobileRules(() => digits)[1];
  expect(rule.validator()).toBe(false); digits = '11999999999'; expect(rule.validator()).toBe(true);
  digits = 'abcdefghijk'; expect(rule.validator()).toBe(false);
  const mask = IMask.createMask(two); mask.resolve('11999999999');
  expect(mask.value).toBe('(11) 99999-9999');
});
test('PWA adapter uses shared messages and preserves accessibility on correction and disposal', async () => {
  const f = fixture(); f.submit();
  await vi.waitFor(() => expect(f.email.getAttribute('aria-invalid')).toBe('true'));
  expect(document.body.textContent).toContain(messages.emailRequired);
  expect(document.body.textContent).toContain(messages.phoneRequired);
  expect(f.email.getAttribute('aria-describedby')).toBe('email-help demo-email-error');
  expect(f.success).not.toHaveBeenCalled();
  f.email.value = 'invalid'; f.phone.value = '11'; f.phone.dispatchEvent(new Event('input', { bubbles: true })); f.submit();
  await vi.waitFor(() => expect(document.body.textContent).toContain(messages.emailInvalid));
  expect(document.body.textContent).toContain(messages.phoneIncomplete);
  f.email.value = 'teste@example.test'; f.phone.value = '11999999999'; f.phone.dispatchEvent(new Event('input', { bubbles: true })); f.submit();
  await vi.waitFor(() => expect(f.success).toHaveBeenCalledOnce());
  expect(f.phone.value).toBe('(11) 99999-9999');
  expect(f.email.getAttribute('aria-invalid')).toBe('false');
  expect(f.email.getAttribute('aria-describedby')).toBe('email-help');
  dispose(); dispose(); dispose = undefined;
  expect(f.email.hasAttribute('aria-invalid')).toBe(false);
  expect(document.querySelector('.just-validate-error-label')).toBeNull();
  f.submit(); await Promise.resolve(); expect(f.success).toHaveBeenCalledOnce();
});
test('editing shared messages changes the PWA build identity', async () => {
  const fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
  const { buildIdentity } = await import('../../scripts/build-config.mjs');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'shared-pwa-id-')), app = tmp + '/frontend';
  try {
    for (const dir of ['frontend/src', 'frontend/public', 'frontend/scripts', 'shared/forms']) await fs.mkdir(tmp + '/' + dir, { recursive: true });
    for (const file of ['index.html', 'package-lock.json', 'vite.config.js']) await fs.writeFile(app + '/' + file, 'fixture');
    const messages = tmp + '/shared/forms/messages.pt-BR.json'; await fs.writeFile(messages, '{"required":"A"}');
    const before = buildIdentity(app, {}); await fs.writeFile(messages, '{"required":"B"}');
    expect(buildIdentity(app, {})).not.toBe(before);
  } finally { await fs.rm(tmp, { recursive: true, force: true }); }
});
