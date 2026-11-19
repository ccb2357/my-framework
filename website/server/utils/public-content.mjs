import { backendFetch } from './backend-fetch.mjs';
import { publicContentResource } from '../../app/services/public-content.js';
export async function readPublicContent(config, fetcher = backendFetch) {
  try {
    const response = await fetcher(new URL('/api/v1/website/content', config.backendTarget), {
      headers: { Accept: 'application/json', Host: config.backendHost, Origin: config.websiteUrl },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return { status: response.status === 429 ? 429 : 503 };
    return { status: 200, body: publicContentResource(await response.json()) };
  } catch { return { status: 503 }; }
}
