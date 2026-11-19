import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import net from 'node:net';
import http from 'node:http';
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
  const pointer = fs.readFileSync(new URL('../.foundation-build.json', import.meta.url), 'utf8');
  let content = { title: 'First public title', body: 'First public body', updatedAt: '2026-11-19T12:00:00Z' }, contentFailure = false;
  const backend = http.createServer((req, res) => {
    assert.equal(req.headers.host, 'website.example.test');
    res.setHeader('content-type', 'application/json');
    if (req.url === '/api/v1/website/content') {
      assert.equal(req.headers.cookie, undefined); assert.equal(req.headers.authorization, undefined);
      res.statusCode = contentFailure ? 503 : 200;
      return res.end(JSON.stringify(contentFailure ? {message:'PRIVATE-BACKEND-ERROR'} : {data:content}));
    }
    const name = req.headers.cookie === 'fixture_client=signed-a' ? 'Client A' : req.headers.cookie === 'fixture_client=signed-b' ? 'Client B' : null;
    res.statusCode = name ? 200 : 401;
    res.end(JSON.stringify(name ? { user: { id: 1, name, email: 'client@example.test' } } : {message:'expired'}));
  });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  const backendConfig = JSON.stringify({ backendTarget: 'http://127.0.0.1:' + backend.address().port, backendHost: 'website.example.test', websiteUrl: 'https://website.example.test', clientSessionCookie: 'fixture_client', devPort: 5184 });
  const child = spawn(process.execPath, ['scripts/start.mjs'], { env: { ...process.env, NUXT_CLIENT_BACKEND: backendConfig, NITRO_PORT: String(port), NITRO_HOST: '127.0.0.1' }, stdio: 'pipe' });
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
    assert.ok(html.includes('First public title'));
    assert.ok(html.includes('First public body'));
    assert.ok(html.includes(config.pwaUrl));
    assert.doesNotMatch(html, /serviceWorker|rel="manifest"|DB_PASSWORD|SMTP_PASS/);
    for (const route of ['/entrar/', '/cadastro/', '/esqueci-senha/', '/redefinir-senha/']) {
      const page = await fetch(`http://127.0.0.1:${port}${route}`);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /<fieldset[^>]*disabled/);
    }
    content = {...content, title: 'Second public title'};
    const changed = await fetch(`http://127.0.0.1:${port}/`, {headers:{Cookie:'fixture_client=signed-a; fixture_admin=PRIVATE'}});
    const changedHtml = await changed.text(); assert.ok(changedHtml.includes('Second public title')); assert.ok(!changedHtml.includes('First public title')); assert.ok(!changedHtml.includes('Client A'));
    const publicJson = await fetch(`http://127.0.0.1:${port}/_content`); assert.match(publicJson.headers.get('cache-control'), /no-store/); assert.equal(publicJson.headers.get('set-cookie'), null); assert.equal((await publicJson.json()).data.title, 'Second public title');
    contentFailure = true;
    const failedHtml = await (await fetch(`http://127.0.0.1:${port}/`)).text(); assert.ok(failedHtml.includes('Não foi possível carregar')); assert.ok(!failedHtml.includes('Second public title')); assert.ok(!failedHtml.includes('PRIVATE-BACKEND-ERROR'));
    assert.equal((await fetch(`http://127.0.0.1:${port}/_content`)).status, 503);
    contentFailure = false; content = null;
    const empty = await (await fetch(`http://127.0.0.1:${port}/`)).text(); assert.ok(empty.includes('Nenhum conteúdo publicado.'));
    assert.equal(fs.readFileSync(new URL('../.foundation-build.json', import.meta.url), 'utf8'), pointer);
    const account = () => fetch(`http://127.0.0.1:${port}/conta/`, { redirect: 'manual' });
    assert.equal((await account()).status, 302);
    for (const [cookie, name, absent] of [['signed-a', 'Client A', 'Client B'], ['signed-b', 'Client B', 'Client A']]) {
      const privatePage = await fetch(`http://127.0.0.1:${port}/conta/`, { headers: { Cookie: 'fixture_client=' + cookie } });
      assert.equal(privatePage.status, 200);
      assert.match(privatePage.headers.get('cache-control'), /no-store/);
      const content = await privatePage.text(); assert.ok(content.includes(name)); assert.ok(!content.includes(absent));
      assert.doesNotMatch(content, /signed-a|signed-b|backendTarget|clientSessionCookie|website.example.test/);
    }
    assert.equal((await account()).status, 302);
    const css = html.match(/href="([^"]+\.css)"/);
    assert.ok(css);
    const asset = await fetch(new URL(css[1], `http://127.0.0.1:${port}`));
    assert.equal(asset.status, 200);
    assert.match(await asset.text(), /bg-background/);
    for (const route of ['/nao-existe', '/sw.js', '/manifest.webmanifest', '/.env.foundation']) assert.equal((await fetch(`http://127.0.0.1:${port}${route}`)).status, 404);
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
    await new Promise(resolve => backend.close(resolve));
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
