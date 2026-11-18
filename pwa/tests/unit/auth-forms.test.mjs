// @vitest-environment jsdom
import { test, expect, vi, afterEach } from 'vitest';
import { initAuthForm } from '../../src/forms/auth.js';
import { passwordRules, messages } from '@shared/forms/rules.js';
let dispose;
afterEach(() => { dispose?.(); dispose = undefined; document.body.innerHTML = ''; });
function setup(registration = true) {
  const names = registration ? ['name', 'email', 'password', 'password_confirmation'] : ['email', 'password'];
  document.body.innerHTML = '<form novalidate>' + names.map(name => `<div><input name="${name}" id="field-${name}" type="${name.includes('password') ? 'password' : 'text'}"><div id="error-${name}" data-errors="${name}"></div></div>`).join('') + '</form>';
  const form = document.querySelector('form'), success = vi.fn();
  dispose = initAuthForm(form, registration, success);
  return { form, success, submit: () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })), fill: data => { for (const [name, value] of Object.entries(data)) form.elements.namedItem(name).value = value; } };
}
test('registration uses common messages, confirmation and accessible error destinations', async () => {
  const f = setup(); f.submit();
  await vi.waitFor(() => expect(f.form.textContent).toContain(messages.nameRequired));
  expect(f.form.elements.email.getAttribute('aria-describedby')).toBe('error-email');
  f.fill({ name: 'Cliente', email: 'client@example.test', password: 'Secret123!', password_confirmation: 'Wrong123!' }); f.submit();
  await vi.waitFor(() => expect(f.form.textContent).toContain(messages.confirmationMismatch)); expect(f.success).not.toHaveBeenCalled();
  f.fill({ password_confirmation: 'Secret123!' }); f.submit();
  await vi.waitFor(() => expect(f.success).toHaveBeenCalledOnce());
  dispose(); dispose = undefined; expect(f.form.elements.email.hasAttribute('aria-invalid')).toBe(false);
});
test('passwords preserve spaces and reject more than 72 UTF-8 bytes; login does not apply new-account minimum', async () => {
  const f = setup(); f.fill({ name: 'Cliente', email: 'client@example.test', password: ' Secret123! ', password_confirmation: ' Secret123! ' }); f.submit();
  await vi.waitFor(() => expect(f.success).toHaveBeenCalledOnce());
  f.fill({ password: 'á'.repeat(37), password_confirmation: 'á'.repeat(37) }); f.submit();
  await vi.waitFor(() => expect(f.form.textContent).toContain(messages.passwordMax));
  expect(passwordRules(false).some(rule => rule.errorMessage === messages.passwordMin)).toBe(false);
});
