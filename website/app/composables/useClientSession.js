import { createClientAuth } from '~/services/client-auth';
import { apiRequest, ApiError } from '~/services/api';
export function useClientSession() {
  const state = useState('website-client-session', () => ({ status: 'unknown', user: null }));
  const app = useNuxtApp();
  if (!app.$clientSession) {
    const requestFetch = useRequestFetch();
    const request = (path, options) => path === '/api/v1/auth/me'
      ? requestFetch('/_session', { cache: 'no-store', retry: 0 }).catch(error => { throw new ApiError('Não foi possível conferir sua sessão.', error.statusCode || error.response?.status || 0); })
      : apiRequest(path, { ...options, csrfRefresh: true });
    app.$clientSession = createClientAuth({ request, state: state.value });
  }
  return { state, auth: app.$clientSession };
}
