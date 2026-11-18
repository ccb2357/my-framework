import http from 'node:http';
import https from 'node:https';
// Node's Fetch may discard Host overrides. Native HTTP preserves the configured Nginx virtual host.
export function backendFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url), headers = Object.fromEntries(new Headers(options.headers));
    headers['accept-encoding'] = 'identity';
    const transport = target.protocol === 'https:' ? https : http;
    const request = transport.request(target, { method: options.method || 'GET', headers, signal: options.signal }, response => {
      const chunks = []; let size = 0;
      response.on('data', chunk => { size += chunk.length; if (size > 1024 * 1024) response.destroy(new Error('Resposta excedeu o limite.')); else chunks.push(chunk); });
      response.on('error', reject);
      response.on('end', () => {
        const resultHeaders = new Headers();
        for (let i = 0; i < response.rawHeaders.length; i += 2) resultHeaders.append(response.rawHeaders[i], response.rawHeaders[i + 1]);
        const body = [204, 205, 304].includes(response.statusCode) ? null : Buffer.concat(chunks);
        resolve(new Response(body, { status: response.statusCode, headers: resultHeaders }));
      });
    });
    request.on('error', reject);
    request.setTimeout(15000, () => request.destroy(new Error('Backend indisponível.')));
    if (options.body) request.write(options.body);
    request.end();
  });
}
