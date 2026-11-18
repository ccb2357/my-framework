import { backendFetch } from './backend-fetch.mjs';
export async function readClientSession(config, cookieHeader = '', fetcher = backendFetch) {
  // Only the client cookie goes to Laravel. Never forward administrator cookies, bearer tokens or arbitrary headers/URLs.
  const cookies = cookieHeader.split(';').map(part => part.trim()).filter(part => part.startsWith(config.clientSessionCookie + '='));
  if (cookies.length !== 1 || cookies[0].length > 16384) return { status: 401 };
  try {
    const response = await fetcher(new URL('/api/v1/auth/me', config.backendTarget), {
      headers: { Accept: 'application/json', Host: config.backendHost, Origin: config.websiteUrl, Cookie: cookies[0] },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
    });
    if (response.status === 401) return { status: 401 };
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return { status: 503 };
    const { user } = await response.json();
    if (!Number.isSafeInteger(user?.id) || user.id < 1 || typeof user.name !== 'string' || typeof user.email !== 'string') return { status: 503 };
    return { status: 200, body: { user: { id: user.id, name: user.name, email: user.email } } };
  } catch { return { status: 503 }; }
}
