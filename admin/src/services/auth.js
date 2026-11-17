export class AdminApiError extends Error {
  constructor(status = 0, errors = {}) { super('Não foi possível concluir a operação.'); this.status = status; this.errors = errors; }
}
export async function adminRequest(path, { method = 'GET', json, fetcher = globalThis.fetch } = {}) {
  if (!['me', 'login', 'logout', 'forgot-password', 'reset-password'].includes(path)) throw new AdminApiError();
  const headers = { Accept: 'application/json' };
  if (method !== 'GET') {
    const csrf = await fetcher('/api/v1/admin/auth/csrf-cookie', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!csrf.ok) throw new AdminApiError(csrf.status);
    const raw = document.cookie.split('; ').find(value => value.startsWith('XSRF-ADMIN-TOKEN='));
    let token; try { token = raw && decodeURIComponent(raw.slice('XSRF-ADMIN-TOKEN='.length)); } catch { throw new AdminApiError(); }
    if (!token) throw new AdminApiError(419);
    headers['X-XSRF-TOKEN'] = token;
  }
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetcher('/api/v1/admin/auth/' + path, { method, headers, credentials: 'same-origin', cache: 'no-store', ...(json === undefined ? {} : { body: JSON.stringify(json) }) });
  if (!response.ok) {
    const errors = {};
    if (response.status === 422 && response.headers.get('content-type')?.includes('application/json')) {
      try { const body = await response.json(); for (const name of ['email', 'password', 'password_confirmation']) if (Array.isArray(body?.errors?.[name])) errors[name] = body.errors[name].filter(value => typeof value === 'string').map(value => value.slice(0,300)).slice(0,2); } catch { /* No raw diagnostic is exposed. */ }
    }
    throw new AdminApiError(response.status, errors);
  }
  if (response.status === 204) return null;
  if (!response.headers.get('content-type')?.includes('application/json')) throw new AdminApiError();
  try { return await response.json(); } catch { throw new AdminApiError(); }
}
export const adminMessage = error => ({ 401: 'E-mail ou senha inválidos, ou sessão encerrada.', 403: 'Acesse pelo endereço administrativo.', 409: 'Já existe uma sessão administrativa ativa. Confira o acesso novamente.', 419: 'Sessão expirada. Tente novamente.', 422: 'Confira os campos informados.', 429: 'Muitas tentativas. Aguarde antes de repetir.' })[error.status] || 'Não foi possível conectar. Confira a conexão e tente novamente.';
export function createAdminAuth(state, request = adminRequest) {
  let revision = 0, pending;
  const reset = (status = 'guest') => { revision++; pending = undefined; state.user = null; state.status = status; };
  const read = body => { const u = body?.user; if (u?.id !== 1 || typeof u.name !== 'string' || typeof u.email !== 'string') throw new AdminApiError(); return { id: u.id, name: u.name, email: u.email }; };
  function check() {
    if (pending) return pending;
    if (state.status === 'authenticating') return Promise.resolve(null);
    reset('checking'); const version = revision;
    const task = request('me').then(body => { const user = read(body); if (version !== revision) return null; state.status = 'authenticated'; state.user = user; return user; })
      .catch(error => { if (version !== revision) return null; state.status = error.status === 401 ? 'guest' : 'unavailable'; if (error.status !== 401) throw error; return null; }).finally(() => { if (pending === task) pending = undefined; });
    pending = task; return task;
  }
  async function login(values) { reset('authenticating'); const version = revision; try { const user = read(await request('login', { method: 'POST', json: { email: values.email, password: values.password } })); if (version !== revision) throw new AdminApiError(); state.user = user; state.status = 'authenticated'; return user; } catch (error) { if (version === revision) reset('guest'); throw error; } }
  async function logout() { reset('ending'); try { await request('logout', { method: 'POST' }); } catch (error) { if (error.status !== 401) { reset('unavailable'); throw error; } } reset(); }
  return { check, login, logout, reset };
}
