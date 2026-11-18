import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import net from 'node:net';
import fs from 'node:fs';
import { checkBuild } from '../scripts/check-build.mjs';
import { readConfiguration } from '../scripts/config.mjs';

test('production server renders Hello, styles and icons without JavaScript and has no PWA or SPA fallback', async () => {
  const { buildId } = checkBuild();
  const config = readConfiguration();
  assert.equal(buildId, config.buildId);
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const child = spawn(process.execPath, ['scripts/start.mjs'], { env: { ...process.env, NITRO_PORT: String(port), NITRO_HOST: '127.0.0.1' }, stdio: 'pipe' });
  let output = ''; child.stderr.on('data', chunk => { output += chunk; });
  try {
    let response;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { response = await fetch(`http://127.0.0.1:${port}/`); break; } catch { await setTimeout(100); }
    }
    assert.ok(response, output);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control'), /no-store/);
    const html = await response.text();
    assert.match(html, /<h1[^>]*>Hello Website<\/h1>/);
    assert.ok(html.includes('website-demo-email'));
    assert.ok(html.includes('website-demo-phone'));
    assert.match(html, /<fieldset[^>]*disabled/);
    assert.ok(html.includes('Ative o JavaScript'));
    assert.doesNotMatch(html, /document is not defined|window is not defined/);
    assert.match(html, /<svg[^>]*[\s\S]*<circle/);
    assert.ok(html.includes(buildId));
    assert.ok(html.includes(config.pwaUrl));
    assert.doesNotMatch(html, /serviceWorker|rel="manifest"|DB_PASSWORD|SMTP_PASS/);
    const css = html.match(/href="([^"]+\.css)"/);
    assert.ok(css);
    const asset = await fetch(new URL(css[1], `http://127.0.0.1:${port}`));
    assert.equal(asset.status, 200);
    assert.match(await asset.text(), /bg-background/);
    for (const route of ['/nao-existe', '/sw.js', '/manifest.webmanifest', '/.env.foundation']) assert.equal((await fetch(`http://127.0.0.1:${port}${route}`)).status, 404);
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
  }
});

test('public configuration ignores unknown fields and website owns its dependencies', () => {
  const config = readConfiguration();
  assert.deepEqual(Object.keys(config).sort(), ['buildId', 'locale', 'name', 'pwaUrl', 'slug', 'websiteUrl']);
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
  assert.ok(!pkg.dependencies.framework7);
  assert.equal(pkg.dependencies.imask, '7.6.1');
  assert.equal(pkg.dependencies['just-validate'], '4.3.0');
  for (const version of Object.values({ ...pkg.dependencies, ...pkg.devDependencies })) assert.match(version, /^\d+\.\d+\.\d+$/);
});

test('a compilation failure preserves the published release pointer', async () => {
  const { spawnSync } = await import('node:child_process');
  const pointer = new URL('../.foundation-build.json', import.meta.url);
  const broken = new URL('../app/pages/__build_failure_test__.vue', import.meta.url);
  const before = fs.readFileSync(pointer, 'utf8');
  fs.writeFileSync(broken, '<script setup>const invalid = ;</script><template><p>invalid</p></template>', { flag: 'wx' });
  try {
    const result = spawnSync(process.execPath, ['scripts/build.mjs'], { encoding: 'utf8', timeout: 60000 });
    assert.notEqual(result.status, 0);
    assert.equal(fs.readFileSync(pointer, 'utf8'), before);
    checkBuild();
  } finally { fs.unlinkSync(broken); }
});
