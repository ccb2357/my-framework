import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { buildConfig } from '../scripts/build-config.mjs';
import { checkBuild } from '../scripts/check-build.mjs';
import { publishBuild } from '../scripts/publish-build.mjs';
import { fetchStatus } from '../src/services/status.js';
const validHtml = '<div id="admin-app"></div><meta name="admin-build" content="admin-0123456789abcdef"><script src="/assets/main-abc.js"></script><link href="/assets/main-abc.css" rel="stylesheet">';
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-build-'));
  await fs.mkdir(root + '/source/assets', { recursive: true });
  await fs.writeFile(root + '/source/index.html', validHtml);
  await fs.writeFile(root + '/source/assets/main-abc.js', 'console.log("admin")');
  await fs.writeFile(root + '/source/assets/main-abc.css', 'body{}');
  return root;
}
afterEach(() => vi.unstubAllGlobals());
describe('admin integration', () => {
  it('browser config uses a whitelist even when input contains secrets', () => {
    const result = buildConfig({ app: { name: 'Admin', slug: 'sample', locale: 'pt-BR', appUrl: 'http://admin.sample.localhost', apiBase: '/api/v1', DB_PASSWORD: 'PRIVATE' }, vite: { proxyTarget: 'http://nginx', proxyHost: 'admin.sample.localhost', devPort: 5182, previewPort: 5183 }, VAPID_PRIVATE_KEY: 'PRIVATE' });
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
    expect(result.app).not.toHaveProperty('proxyTarget');
  });
  it('failed staging preserves the previously served index', async () => {
    const root = await fixture();
    try {
      await fs.mkdir(root + '/dist'); await fs.writeFile(root + '/dist/index.html', 'previous');
      await fs.writeFile(root + '/source/sw.js', 'worker');
      await expect(publishBuild(root + '/source', root + '/dist')).rejects.toThrow();
      expect(await fs.readFile(root + '/dist/index.html', 'utf8')).toBe('previous');
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });
  it('publishes complete assets and rejects accidental Framework7 code', async () => {
    const root = await fixture();
    try {
      const build = await publishBuild(root + '/source', root + '/dist');
      expect(build.files).toContain('assets/main-abc.css');
      expect(await checkBuild(root + '/dist')).toEqual(build);
      await fs.writeFile(root + '/dist/assets/main-abc.js', 'import "framework7";');
      await expect(checkBuild(root + '/dist')).rejects.toThrow('PWA');
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });
  it('rejects fake or stale backend success on HTTP/payload failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok', checks: { application: 'ok', database: 'ok' } }) }));
    await expect(fetchStatus()).resolves.toHaveProperty('status', 'ok');
    globalThis.fetch.mockResolvedValueOnce({ ok: false });
    await expect(fetchStatus()).rejects.toThrow();
    globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok', checks: { database: 'error' } }) });
    await expect(fetchStatus()).rejects.toThrow();
  });
});
it('editing shared messages changes the administrative build identity', async () => {
  const { buildIdentity } = await import('../scripts/build-config.mjs');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'shared-admin-id-')), app = tmp + '/admin';
  try {
    for (const dir of ['admin/src', 'admin/scripts', 'shared/forms']) await fs.mkdir(tmp + '/' + dir, { recursive: true });
    for (const file of ['index.html', 'package-lock.json', 'vite.config.js', 'scripts/build-config.mjs']) await fs.writeFile(app + '/' + file, 'fixture');
    const messages = tmp + '/shared/forms/messages.pt-BR.json'; await fs.writeFile(messages, '{"required":"A"}');
    const before = buildIdentity(app, {}); await fs.writeFile(messages, '{"required":"B"}');
    expect(buildIdentity(app, {})).not.toBe(before);
  } finally { await fs.rm(tmp, { recursive: true, force: true }); }
});
