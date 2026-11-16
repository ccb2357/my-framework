import { ApiError } from './api.js';
export function createClientAuth({ request, state, afterLogout = async () => {} }) {
  let revision = 0, pending;
  function set(status, user = null) { state.status = status; state.user = user; }
  function invalidate(status = 'guest') { revision++; pending = undefined; set(status); }
  function userOf(body) {
    const user = body?.user;
    if (!Number.isSafeInteger(user?.id) || user.id < 1 || typeof user.name !== 'string' || typeof user.email !== 'string') throw new ApiError('Resposta de sessão inválida.');
    return { id: user.id, name: user.name, email: user.email };
  }
  function check() {
    if (pending) return pending;
    const version = ++revision;
    set('checking');
    const task = request('/api/v1/auth/me').then(body => {
      const user = userOf(body);
      if (version !== revision) return null;
      set('authenticated', user); return user;
    }).catch(error => {
      if (version !== revision) return null;
      if (error.status === 401) { set('guest'); return null; }
      set('unavailable'); throw error;
    }).finally(() => { if (pending === task) pending = undefined; });
    pending = task; return task;
  }
  async function authenticate(mode, values) {
    invalidate(); const version = revision;
    const json = { email: values.email, password: values.password };
    if (mode === 'register') Object.assign(json, { name: values.name, password_confirmation: values.password_confirmation });
    const user = userOf(await request('/api/v1/auth/' + mode, { method: 'POST', json }));
    if (version !== revision) throw new ApiError('A sessão mudou. Confira o acesso novamente.');
    set('authenticated', user); return user;
  }
  async function logout() {
    invalidate('ending');
    try { await request('/api/v1/auth/logout', { method: 'POST' }); }
    catch (error) { if (error.status !== 401) { set('unavailable'); throw error; } }
    set('guest');
    try { await afterLogout(); } catch { /* Server already revoked the session-bound subscription. */ }
  }
  return { check, login: values => authenticate('login', values), register: values => authenticate('register', values), logout, invalidate };
}
export function authMessage(error) {
  return ({ 401: 'E-mail ou senha inválidos, ou sessão encerrada.', 403: 'Acesso negado neste endereço.', 409: 'Já existe uma sessão ativa. Saia dela antes de entrar em outra conta.', 419: 'Sessão expirada. Recarregue a página e tente novamente.', 422: 'Confira os campos informados.', 429: 'Muitas tentativas. Aguarde antes de repetir.' })[error.status] || 'Não foi possível conectar ao servidor. Confira a conexão e tente novamente.';
}
