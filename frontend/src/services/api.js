export class ApiError extends Error {
  constructor(message, status = 0, errors = {}) { super(message); this.status = status; this.errors = errors; }
}
const readCookie = name => {
  const raw = (globalThis.document?.cookie || '').split('; ').find(part => part.startsWith(name + '='));
  try { return raw ? decodeURIComponent(raw.slice(name.length + 1)) : ''; } catch { return ''; }
};
export async function apiRequest(path, { method = 'GET', json, signal, csrfRefresh = false, fetcher = globalThis.fetch } = {}) {
  if (!path.startsWith('/api/v1/') || path.startsWith('//')) throw new ApiError('Rota de API inválida.');
  const headers = { Accept: 'application/json' };
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    if (csrfRefresh || !readCookie('XSRF-TOKEN')) {
      const csrf = await fetcher('/sanctum/csrf-cookie', { credentials: 'include', cache: 'no-store', signal });
      if (!csrf.ok) throw new ApiError('Não foi possível iniciar a sessão.', csrf.status);
    }
    const token = readCookie('XSRF-TOKEN');
    if (!token) throw new ApiError('Token CSRF indisponível.');
    headers['X-XSRF-TOKEN'] = token;
  }
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetcher(path, { method, headers, credentials: 'include', cache: 'no-store', signal, ...(json === undefined ? {} : { body: JSON.stringify(json) }) });
  if (!response.ok) {
    const errors = {};
    if (response.status === 422 && response.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await response.json();
        for (const key of ['name', 'email', 'password', 'password_confirmation']) {
          const value = body?.errors?.[key];
          if (Array.isArray(value)) errors[key] = value.filter(message => typeof message === 'string').map(message => message.slice(0, 300)).slice(0, 2);
        }
      } catch { /* Do not expose arbitrary response bodies. */ }
    }
    throw new ApiError(response.status === 503 ? 'Serviço indisponível.' : 'A requisição não foi concluída.', response.status, errors);
  }
  if (response.status === 204) return null;
  if (!response.headers.get('content-type')?.includes('application/json')) throw new ApiError('A API não retornou JSON.', response.status);
  try { return await response.json(); } catch { throw new ApiError('Resposta JSON inválida.', response.status); }
}
export async function getStatus(options) {
  const result = await apiRequest('/api/v1/status', options);
  if (result?.status !== 'ok' || result.checks?.application !== 'ok' || result.checks?.database !== 'ok') throw new ApiError('Diagnóstico não confirmou backend e banco.', 503);
  return result;
}
