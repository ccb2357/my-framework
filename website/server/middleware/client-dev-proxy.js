import { defineEventHandler, getRequestURL, proxyRequest, createError, setHeader } from 'h3';
import { backendFetch } from '../utils/backend-fetch.mjs';
const paths = new Set(['/sanctum/csrf-cookie', ...['me', 'login', 'logout', 'register', 'forgot-password', 'reset-password'].map(name => '/api/v1/auth/' + name)]);
export default defineEventHandler(async event => {
  if (!import.meta.dev) return;
  const url = getRequestURL(event);
  if (!paths.has(url.pathname)) return;
  const config = useRuntimeConfig(event).clientBackend;
  setHeader(event, 'Cache-Control', 'no-store, private');
  try {
    return await proxyRequest(event, new URL(url.pathname, config.backendTarget).href, { fetch: backendFetch, headers: { host: config.backendHost }, fetchOptions: { redirect: 'error', signal: AbortSignal.timeout(15000) } });
  } catch { throw createError({ statusCode: 503, statusMessage: 'Backend indisponível.' }); }
});
