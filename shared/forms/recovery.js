import { accountEmailRules, passwordRules, confirmationRules, messages } from './rules.js';
export function readRecoveryLink(location, history) {
 const params = new globalThis.URLSearchParams(location.hash.slice(1)), token = params.get('token') || '', email = params.get('email') || '';
 if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
 return { token: /^[a-f0-9]{64}$/.test(token) ? token : '', email };
}
export function recoveryForm(JustValidate, form, reset, submit) {
 const validator = new JustValidate(form, { errorFieldStyle: {}, errorLabelStyle: {}, focusInvalidField: true });
 const input = name => form.querySelector(`[name="${name}"]`);
 const fields = { email: accountEmailRules() };
 if (reset) { fields.password = passwordRules(true, () => input('password').value); fields.password_confirmation = confirmationRules(() => input('password').value, () => input('password_confirmation').value); }
 for (const [name, rules] of Object.entries(fields)) { const errors = form.querySelector(`[data-errors="${name}"]`); input(name).setAttribute('aria-describedby', errors.id); validator.addField(input(name), rules, { errorsContainer: errors }); }
 validator.onValidate(({ fields }) => { for (const field of Object.values(fields)) if (typeof field.isValid === 'boolean') field.elem.setAttribute('aria-invalid', String(!field.isValid)); }).onSuccess(event => { event?.preventDefault(); submit(); });
 return () => validator.destroy();
}
export function createRecovery(request, state, reset, link = {}) {
 let token = link.token || '', active = true;
 state.email = link.email || ''; state.password = ''; state.password_confirmation = ''; state.busy = false; state.message = reset && !token ? messages.resetInvalid : ''; state.done = false;
 async function submit() {
  if (state.busy || state.done || !active) return;
  if (reset && !token) { state.message = messages.resetInvalid; return; }
  state.busy = true; state.message = '';
  const json = { email: state.email };
  if (reset) Object.assign(json, { token, password: state.password, password_confirmation: state.password_confirmation });
  try { await request(reset ? 'reset-password' : 'forgot-password', json); if (active) { state.message = reset ? messages.resetDone : messages.recoverySent; state.done = true; token = ''; state.password = ''; state.password_confirmation = ''; } }
  catch (error) { if (active) state.message = error.status === 429 ? 'Muitas tentativas. Aguarde antes de repetir.' : reset && error.status === 422 ? messages.resetInvalid : error.status === 419 ? 'Sessão expirada. Recarregue e tente novamente.' : 'Não foi possível concluir. Confira a conexão e tente novamente.'; }
  finally { state.busy = false; }
 }
 return { submit, resume: () => { active = true; }, dirty: () => !state.done && (Boolean(token) || Object.values(state).some(value => typeof value === 'string' && Boolean(value))), destroy: () => { active = false; token = ''; state.password = ''; state.password_confirmation = ''; } };
}
