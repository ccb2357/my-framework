import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { run } from '../lib/process.mjs';
import { validate, parseCentral } from '../lib/config.mjs';
import { nginxSnippet, websiteNginxSnippet } from '../lib/templates.mjs';
const entry = fileURLToPath(new URL('../index.mjs', import.meta.url));
const runtime = process.env.FOUNDATION_RUNTIME_PACKAGE || fileURLToPath(new URL('../executor/package.json', import.meta.url));
const example = parseCentral(await fs.readFile(new URL('../../../.env.foundation.example', import.meta.url), 'utf8'));
// Deterministic Engine/Compose simulation; never connects to or mutates a real Docker Engine.
async function fixture({ pending = false, production = false, desktop = false, httpFailure = false, npmFailure = false, buildFailure = false, pwaFailure = false, frontendNode = '22.23.4', guideCrlf = false, adminBuildFailure = false, adminHttpFailure = false, missingAdmin = false, missingShared = false, websiteBuildFailure = false, websiteHttpFailure = false, missingWebsite = false, websiteActivationFailure = false, websiteStartupFailures = 0 } = {}) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'foundation flow with spaces-'));
  const projects = tmp + '/projects', root = projects + '/product-a';
  await fs.mkdir(root + '/backend', { recursive: true }); await fs.mkdir(root + '/pwa'); await fs.mkdir(root + '/admin'); await fs.mkdir(root + '/website'); await fs.mkdir(projects + '/infra'); await fs.mkdir(tmp + '/bin');
  const guide = await fs.readFile(new URL('../../../instalacao-pwa-framework.md', import.meta.url), 'utf8');
  await fs.writeFile(root + '/instalacao-pwa-framework.md', guideCrlf ? guide.replace(/\r?\n/g, '\r\n') : guide);
  await fs.writeFile(projects + '/infra/docker-compose.yml', '# fixture'); await fs.writeFile(root + '/backend/composer.lock', '{}');
  await fs.writeFile(root + '/pwa/package.json', JSON.stringify({ scripts: { dev: 'vite', build: 'vite build' } }));
  await fs.writeFile(root + '/pwa/package-lock.json', '{}');
  await fs.writeFile(root + '/admin/package.json', JSON.stringify({ scripts: { dev: 'vite', build: 'vite build' } }));
  await fs.writeFile(root + '/admin/package-lock.json', '{}');
  await fs.writeFile(root + '/website/package.json', JSON.stringify({ scripts: { dev: 'nuxt dev', build: 'nuxt build' } }));
  await fs.writeFile(root + '/website/package-lock.json', '{}');
  const values = { ...example, PROJECT_SLUG: 'product-a', LOCAL_DOMAIN: 'product-a.localhost', DB_DATABASE: 'product_a', DB_TEST_DATABASE: 'product_a_test', CONTAINER_PROJECTS_ROOT: projects, APP_ENV: production ? 'production' : 'local', PRODUCTION_URL: production ? 'https://example.com' : '', DB_PASSWORD: 'fixture$special #password' };
  await fs.writeFile(root + '/.env.foundation', Object.entries(values).map(([k, v]) => `${k}='${v}'`).join('\n'));
  const c = validate(values, root);
  const source = desktop ? '/run/desktop/mnt/host/c/var/www' : '/srv/apps';
  const composeHostRoot = desktop ? 'C:/var/www' : '/srv/apps';
  const mounts = [{ Type: 'bind', Source: source, Destination: projects, RW: true }];
  const labels = service => ({ 'com.docker.compose.service': service, 'com.docker.compose.project': 'shared-infra', 'com.docker.compose.project.config_files': composeHostRoot + '/infra/docker-compose.yml', 'com.docker.compose.project.working_dir': composeHostRoot + '/infra', 'com.docker.compose.oneoff': 'False' });
  const php = { Id: 'php-id', Config: { Labels: labels('php-fpm') }, State: { Running: true }, Mounts: [...mounts, ...(!pending ? [{ Type: 'volume', Name: c.vendorVolume, Destination: c.backend + '/vendor' }] : [])], NetworkSettings: { Networks: { infra_network: {} }, Ports: {} } };
  const nginx = { Id: 'nginx-id', Config: { Labels: labels('nginx') }, State: { Running: true }, Mounts: mounts, NetworkSettings: { Networks: { infra_network: {} }, Ports: {} } };
  const config = { services: { 'php-fpm': { volumes: [{ type: 'volume', source: c.vendorVolume, target: c.backend + '/vendor' }] }, [c.nodeService]: { image: 'node:22-alpine', working_dir: '/app', profiles: ['dev'], networks: { infra_network: {} }, volumes: [{ type: 'bind', source: '/srv/apps/product-a/pwa', target: '/app' }, { type: 'volume', source: c.modulesVolume, target: '/app/node_modules' }], ports: [{ target: 5173, published: String(c.DEV_PORT), host_ip: '127.0.0.1' }] } }, volumes: { [c.vendorVolume]: { name: c.vendorVolume }, [c.modulesVolume]: { name: c.modulesVolume } } };
  config.volumes[c.adminModulesVolume] = { name: c.adminModulesVolume };
  if (!missingAdmin) config.services[c.adminNodeService] = { image: 'node:22-alpine', working_dir: '/app', profiles: ['dev'], networks: { infra_network: {} }, volumes: [{ type: 'bind', source: '/srv/apps/product-a/admin', target: '/app' }, { type: 'volume', source: c.adminModulesVolume, target: '/app/node_modules' }], ports: [{ target: 5173, published: String(c.ADMIN_DEV_PORT), host_ip: '127.0.0.1' }] };
  for (const service of Object.values(config.services)) {
    if (service.image === 'node:22-alpine' && !missingShared) service.volumes.push({ type: 'bind', source: '/srv/apps/product-a/shared', target: '/shared', read_only: true });
  }
  config.volumes[c.websiteModulesVolume] = { name: c.websiteModulesVolume };
  if (!missingWebsite) config.services[c.websiteService] = { image: 'node:22-bookworm-slim', working_dir: '/app', command: ['node', 'scripts/start.mjs'], profiles: ['website'], environment: { NODE_ENV: 'production', NITRO_HOST: '0.0.0.0', NITRO_PORT: '3000' }, networks: { infra_network: {} }, volumes: [{ type: 'bind', source: '/srv/apps/product-a/website', target: '/app' }, { type: 'volume', source: c.websiteModulesVolume, target: '/app/node_modules' }] };
  const data = { websiteActivationFailure, websiteStartupFailures, websiteActivations: 0, websiteLiveBuildId: '', websiteActivationInputs: [], websiteBuildFailure, websiteHttpFailure, websiteInstalls: 0, websiteBuilds: 0, websiteMarker: '', websiteBuildId: '', adminBuildFailure, adminHttpFailure, adminInstalls: 0, adminBuilds: 0, adminMarker: '', php, nginx, config, site: pending ? '' : nginxSnippet(c) + nginxSnippet(c, true) + websiteNginxSnippet(c), marker: '', installs: 0, syncs: 0, calls: [], httpFailure, npmMarker: '', npmInstalls: 0, npmFailure, builds: 0, buildFailure, pwaFailure, frontendNode };
  const dataFile = tmp + '/fake-engine.json'; await fs.writeFile(dataFile, JSON.stringify(data));
  const fake = `#!${process.execPath}
import fs from 'node:fs';
const file=process.env.FAKE_ENGINE_DATA;const data=JSON.parse(fs.readFileSync(file));const a=process.argv.slice(2);data.calls.push(a);let out='';
const stdin=()=>fs.readFileSync(0,'utf8');
if(a[0]==='version')out='"fixture"';
else if(a[0]==='compose'&&a.includes('version'))out='2.40.3';
else if(a[0]==='compose'&&a.includes('config'))out=JSON.stringify(data.config);
else if(a[0]==='compose'&&a.includes('up')){data.websiteActivations++;data.websiteActivationInputs.push(JSON.parse(stdin()));if(data.websiteActivationFailure){process.exitCode=55;process.stderr.write('PRIVATE-ACTIVATION');}else data.websiteLiveBuildId=data.websiteBuildId;}
else if(a[0]==='ps')out=a.some(x=>x.includes('service=php-fpm'))?'php-id':'php-id nginx-id';
else if(a[0]==='inspect')out=JSON.stringify(a.slice(1).map(x=>x==='php-id'?data.php:data.nginx));
else if(a[0]==='run'){
 const website=a.some(x=>x.includes('_website_node_modules'));
 const admin=a.some(x=>x.includes('_admin_node_modules'));
 if(website){
  if(a.includes('ci'))data.websiteInstalls++;
  else if(a.includes('build')){data.websiteBuilds++;if(data.websiteBuildFailure){process.exitCode=47;process.stderr.write('PRIVATE-WEBSITE-OUTPUT');}else data.websiteBuildId=JSON.parse(fs.readFileSync(process.env.WEBSITE_ROOT+'/.foundation.public.json')).buildId;}
  else if(a.includes('scripts/check-build.mjs')){if(data.websiteBuildId)out=JSON.stringify({buildId:data.websiteBuildId});else process.exitCode=1;}
  else if(a.includes('-e')){const code=a[a.indexOf('-e')+1];if(code.includes('JSON.stringify'))out=JSON.stringify({nodeVersion:data.frontendNode,marker:data.websiteMarker,metadata:!!data.websiteMarker});else if(code.includes('writeFileSync'))data.websiteMarker=stdin().trim();}
 }else if(admin){
  if(a.includes('ci'))data.adminInstalls++;
  else if(a.includes('build')){data.adminBuilds++;if(data.adminBuildFailure){process.exitCode=46;process.stderr.write('PRIVATE-ADMIN-OUTPUT');}}
  else if(a.includes('scripts/check-build.mjs'))out=JSON.stringify({buildId:'admin-fixture',entry:'assets/admin-fixture.js',files:['index.html','assets/admin-fixture.js']});
  else if(a.includes('-e')){const code=a[a.indexOf('-e')+1];if(code.includes('JSON.stringify'))out=JSON.stringify({nodeVersion:data.frontendNode,marker:data.adminMarker,metadata:!!data.adminMarker});else if(code.includes('writeFileSync'))data.adminMarker=stdin().trim();}
 } else
 if(a.includes('ci')){data.npmInstalls++;if(data.npmFailure){process.exitCode=42;process.stderr.write('PRIVATE-NPM-OUTPUT');}}
 else if(a.includes('build')){data.builds++;if(data.buildFailure){process.exitCode=45;process.stderr.write('PRIVATE-BUILD-OUTPUT');}}
 else if(a.includes('scripts/check-pwa.mjs'))out=JSON.stringify({buildId:'0.4.0-fixture',entry:'assets/app-fixture.js',files:['index.html','assets/app-fixture.js']});
 else if(a.includes('-e')){const code=a[a.indexOf('-e')+1];if(code.includes('JSON.stringify'))out=JSON.stringify({nodeVersion:data.frontendNode,marker:data.npmMarker,metadata:!!data.npmMarker});else if(code.includes('writeFileSync'))data.npmMarker=stdin().trim();}
}
else if(a[0]==='exec'){
 if(a.includes('nginx'))out=data.site;
 else if(a.includes('--version'))out='Composer version 2.11.2';
 else if(a.includes('-m'))out='ctype\\ncurl\\ndom\\nfileinfo\\nmbstring\\nopenssl\\npdo\\npdo_mysql\\nsession\\ntokenizer\\nxml';
 else if(a.includes('install'))data.installs++;
 else if(a.includes('app:sync'))data.syncs++;
 else if(a.some(x=>x.endsWith('databases.php'))){stdin();out='{"status":"ok"}';}
 else if(a.some(x=>x.endsWith('verify-runtime.php')))stdin();
 else if(a.some(x=>x.endsWith('verify-pwa.php'))){stdin();out=JSON.stringify({status:data.pwaFailure?'error':'ok',checks:{simulation:'ok'}});if(data.pwaFailure)process.exitCode=1;}
 else if(a.some(x=>x.endsWith('verify-website.php'))){stdin();const failed=data.websiteHttpFailure||data.websiteLiveBuildId!==data.websiteBuildId||data.websiteStartupFailures>0;if(data.websiteLiveBuildId&&data.websiteStartupFailures>0)data.websiteStartupFailures--;out=JSON.stringify({status:failed?'error':'ok',checks:{simulation:'ok'}});if(failed)process.exitCode=1;}
 else if(a.some(x=>x.endsWith('verify-admin.php'))){stdin();out=JSON.stringify({status:data.adminHttpFailure?'error':'ok',checks:{simulation:'ok'}});if(data.adminHttpFailure)process.exitCode=1;}
 else if(a.some(x=>x.endsWith('verify-http.php'))){stdin();out=data.httpFailure?JSON.stringify({status:'error',reason:'csrf-token-missing',path:'/sanctum/csrf-cookie',http_status:204,curl_errno:0,origin_index:3,body:'PRIVATE-BODY'}):'{"status":"ok","checks":{"simulation":"ok"}}';if(data.httpFailure){process.exitCode=1;process.stderr.write('PRIVATE-STDERR');}}
 else if(a.includes('-r')){
  const code=a[a.indexOf('-r')+1];
  if(code.includes('PHP_VERSION'))out='8.2.35';
  else if(code.includes('json_encode'))out=JSON.stringify({marker:data.marker,metadata:!!data.marker});
  else if(code.includes('file_put_contents'))data.marker=stdin().trim();
 }
}else{process.exitCode=90;}
fs.writeFileSync(file,JSON.stringify(data));process.stdout.write(out);
`;
  await fs.writeFile(tmp + '/bin/docker', fake, { mode: 0o755 });
  const invoke = async force => run(process.execPath, [entry, '--project', root, ...(force ? ['--force'] : [])], { allowFailure: true, env: { ...process.env, PATH: tmp + '/bin:' + process.env.PATH, FOUNDATION_RUNTIME_PACKAGE: runtime, FAKE_ENGINE_DATA: dataFile, WEBSITE_ROOT: root + '/website' }, timeout: 30000 });
  return { root, invoke, data: async () => JSON.parse(await fs.readFile(dataFile, 'utf8')), cleanup: () => fs.rm(tmp, { recursive: true, force: true }) };
}
test('preparation exits 2 before dependencies/env writes when effective infra is missing', async () => {
  const f = await fixture({ pending: true, guideCrlf: true });
  try {
    const result = await f.invoke(); assert.equal(result.code, 2); assert.equal((await f.data()).installs, 0);
    await assert.rejects(fs.access(f.root + '/backend/.env'));
    const guide = await fs.readFile(f.root + '/instalacao-pwa-framework.md', 'utf8');
    assert.match(guide, /product-a-node/); assert.match(guide, /product_a_vendor/);
    assert.match(guide, /server_name product-a.localhost/);
    // Check the command and its ordering, regardless of Markdown fences or Windows CRLF.
    const firstRun = guide.search(/^[ \t]*docker run --rm[^\r\n]*pwa-foundation-bootstrap:0\.1\.0[^\r\n]* --project \S+/m);
    assert.notEqual(firstRun, -1, 'Guia deve conter o comando de bootstrap com --project.');
    assert.doesNotMatch(guide, /docker compose (?:run.*|build) pwa-foundation-bootstrap/);
    assert.doesNotMatch(guide, /services:\s+pwa-foundation-bootstrap:/);
    assert.match(guide, /docker build -t pwa-foundation-bootstrap:0\.1\.0/);
    assert.match(guide, /source=C:\\var\\www,target=\/var\/www/);
    assert.match(guide, /--network infra_network/);
    assert.doesNotMatch(guide, /não cadastrar serviço de bootstrap no Compose|aplique \*\*todos os quatro itens/);
    assert.ok(guide.indexOf('### 2.4 Sites Nginx') < guide.indexOf('## 3. Validar e aplicar a infraestrutura'));
    assert.ok(guide.indexOf('## 3. Validar e aplicar a infraestrutura') < firstRun);
    const imageBuild = guide.indexOf('docker build -t pwa-foundation-bootstrap:0.1.0');
    assert.ok(guide.indexOf('## 3. Validar e aplicar a infraestrutura') < imageBuild);
    assert.ok(imageBuild < guide.indexOf('## 5. Executar o bootstrap'));
    assert.ok(guide.indexOf('## 5. Executar o bootstrap') < firstRun);
    assert.match(result.stderr, /instalacao-pwa-framework.md/);
    await assert.rejects(fs.access(f.root + '/infra-generated'));
    assert.doesNotMatch(result.stdout + result.stderr, /fixture\$special/);
  } finally { await f.cleanup(); }
});
test('Desktop mount and Windows labels discover the same Compose and reach the pending stage', async () => {
  const f = await fixture({ pending: true, desktop: true });
  try {
    const result = await f.invoke();
    assert.equal(result.code, 2, result.stdout + result.stderr);
    const data = await f.data();
    assert.equal(data.installs, 0);
    assert.ok(data.calls.some(a => a[0] === 'compose' && a.includes('config')));
    assert.match(await fs.readFile(f.root + '/instalacao-pwa-framework.md', 'utf8'), /C:\/var\/www\/product-a\/pwa/);
    await assert.rejects(fs.access(f.root + '/backend/.env'));
  } finally { await f.cleanup(); }
});
test('initialized flow preserves keys and skips unchanged dependencies on reexecution', async () => {
  const f = await fixture();
  try {
    const first = await f.invoke(); assert.equal(first.code, 0, first.stdout + first.stderr);
    const env = await fs.readFile(f.root + '/backend/.env', 'utf8');
    const guidePath = f.root + '/instalacao-pwa-framework.md';
    await fs.appendFile(guidePath, '\nObservação local preservada.\n');
    const guide = await fs.readFile(guidePath, 'utf8');
    const second = await f.invoke(); assert.equal(second.code, 0, second.stderr); assert.equal(await fs.readFile(f.root + '/backend/.env', 'utf8'), env);
    assert.equal(await fs.readFile(guidePath, 'utf8'), guide);
    assert.equal((guide.match(/<!-- BEGIN FOUNDATION INSTALL INFRA -->/g) || []).length, 1);
    const data = await f.data(); assert.equal(data.installs, 1); assert.equal(data.syncs, 2); assert.equal(data.npmInstalls, 1); assert.equal(data.adminInstalls, 1); assert.equal(data.adminBuilds, 2); assert.equal(data.websiteInstalls, 1); assert.equal(data.websiteBuilds, 1);
    assert.ok(data.calls.filter(a => a[0] === 'run' && a.some(x => x.includes('_website_node_modules'))).every(a => a.includes('node:22-bookworm-slim')));
    const runs = data.calls.filter(a => a[0] === 'run' && (a.includes('build') || a.includes('ci')));
    assert.ok(runs.every(a => a.some(x => x.includes('target=/shared,readonly'))));
    assert.ok(data.calls.some(a => a[0] === 'run' && a.includes('--publish') && a.includes('infra_network')));
    const state = JSON.parse(await fs.readFile(f.root + '/.foundation-state.json', 'utf8')); assert.equal(state.completeFoundation, false); assert.equal(state.release, '1.1.0-website.1'); assert.deepEqual(state.pending, []); assert.equal(state.manualChecks.length, 3); assert.equal(state.phase, 'interfaces-ready'); assert.equal(state.frontendBuild, '0.4.0-fixture'); assert.equal(data.builds, 2);
    assert.equal(data.websiteActivations, 1);
    assert.ok(data.calls.filter(a => a[0] === 'compose' && ['up', 'run', 'down'].some(x => a.includes(x))).every(a => a.includes('up') && a.includes('--no-deps') && a.includes('--no-build') && a.at(-1) === 'product-a-website-node'));
    assert.ok(data.websiteActivationInputs.every(x => Object.keys(x.services).join() === 'product-a-website-node'));
    assert.doesNotMatch(first.stdout + first.stderr + second.stdout + second.stderr, /fixture\$special/);
  } finally { await f.cleanup(); }
});
test('production requires force before backend initialization and does not generate testing env', async () => {
  const f = await fixture({ production: true });
  try {
    const blocked = await f.invoke(); assert.equal(blocked.code, 1, blocked.stdout + blocked.stderr); assert.equal((await f.data()).installs, 0); await assert.rejects(fs.access(f.root + '/backend/.env'));
    const allowed = await f.invoke(true); assert.equal(allowed.code, 0, allowed.stderr); await assert.rejects(fs.access(f.root + '/backend/.env.testing'));
    const data = await f.data(); assert.ok(data.calls.some(a => a.includes('app:sync') && a.includes('--force')));
  } finally { await f.cleanup(); }
});
test('HTTP failure identifies the failed contract and leaves state failed without exposing raw output', async () => {
  const f = await fixture({ httpFailure: true });
  try {
    const result = await f.invoke();
    assert.equal(result.code, 1);
    assert.match(result.stderr, /\/sanctum\/csrf-cookie; cookie XSRF-TOKEN ausente; HTTP 204/);
    assert.match(result.stderr, /origem nº 3/);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE/);
    assert.equal(JSON.parse(await fs.readFile(f.root + '/.foundation-state.json', 'utf8')).phase, 'failed');
  } finally { await f.cleanup(); }
});

test('npm failure stops frontend completion without exposing raw output or marking dependencies installed', async () => {
  const f = await fixture({ npmFailure: true });
  try {
    const result = await f.invoke();
    assert.equal(result.code, 1); assert.match(result.stderr, /npm ci/);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE-NPM/);
    const data = await f.data(); assert.equal(data.npmMarker, '');
    const state = JSON.parse(await fs.readFile(f.root + '/.foundation-state.json', 'utf8'));
    assert.equal(state.phase, 'failed'); assert.notEqual(state.frontendLock, true);
  } finally { await f.cleanup(); }
});

test('failed builds or PWA HTTP checks never mark initialization complete', async () => {
  for (const options of [{ buildFailure: true }, { pwaFailure: true }]) {
    const f = await fixture(options);
    try { const result = await f.invoke(); assert.equal(result.code, 1); const state = JSON.parse(await fs.readFile(f.root + '/.foundation-state.json', 'utf8')); assert.equal(state.phase, 'failed'); assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE-BUILD/); }
    finally { await f.cleanup(); }
  }
});

test('outdated Node stops before installing frontend dependencies', async () => {
  const f = await fixture({ frontendNode: '22.12.0' });
  try {
    const result = await f.invoke();
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Node 22.13/);
    assert.equal((await f.data()).npmInstalls, 0);
    assert.equal((await f.data()).builds, 0);
  } finally { await f.cleanup(); }
});

test('missing admin integration stops before installing or writing private env', async () => {
  const f = await fixture({ missingAdmin: true });
  try {
    const result = await f.invoke(); assert.equal(result.code, 2); assert.match(result.stdout, /product-a-admin-node/);
    assert.equal((await f.data()).installs, 0); await assert.rejects(fs.access(f.root + '/backend/.env'));
  } finally { await f.cleanup(); }
});
test('admin build or HTTP failure never announces successful installation', async () => {
  for (const options of [{ adminBuildFailure: true }, { adminHttpFailure: true }]) {
    const f = await fixture(options);
    try {
      const result = await f.invoke(); assert.equal(result.code, 1, result.stdout + result.stderr);
      const state = JSON.parse(await fs.readFile(f.root + '/.foundation-state.json', 'utf8'));
      assert.equal(state.phase, 'failed'); assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE-ADMIN|Admin: http/);
    } finally { await f.cleanup(); }
  }
});

test('missing shared mounts stop before installs and both Node services receive readonly shared', async () => {
  const f = await fixture({ missingShared: true });
  try {
    const result = await f.invoke(); assert.equal(result.code, 2, result.stdout + result.stderr);
    assert.match(result.stdout, /shared.*somente leitura/);
    assert.equal((await f.data()).installs, 0); await assert.rejects(fs.access(f.root + '/backend/.env'));
    const guide = await fs.readFile(f.root + '/instalacao-pwa-framework.md', 'utf8');
    assert.equal((guide.match(/target: \/shared/g) || []).length, 2);
    assert.equal((guide.match(/read_only: true/g) || []).length, 2);
  } finally { await f.cleanup(); }
});

test('website missing integration and failed build cannot announce success', async () => {
  for (const options of [{ missingWebsite: true }, { websiteBuildFailure: true }, { websiteHttpFailure: true }]) {
    const f = await fixture(options);
    try {
      const result = await f.invoke();
      assert.equal(result.code, options.missingWebsite ? 2 : 1, result.stdout + result.stderr);
      assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE-WEBSITE|Website: http/);
      const state = JSON.parse(await fs.readFile(f.root + '/.foundation-state.json', 'utf8'));
      assert.equal(state.completeFoundation, false);
      if (options.missingWebsite) { assert.equal((await f.data()).installs, 0); await assert.rejects(fs.access(f.root + '/backend/.env')); }
      if (options.websiteHttpFailure) { assert.match(result.stderr, /não respondeu com o build esperado/); assert.equal((await f.data()).websiteActivations, 1); }
    } finally { await f.cleanup(); }
  }
});

test('website starts once, waits for readiness, then recreates only for a changed build', async () => {
  const f = await fixture({ websiteStartupFailures: 2 });
  try {
    const first = await f.invoke(); assert.equal(first.code, 0, first.stdout + first.stderr);
    assert.equal((await f.data()).websiteActivations, 1);
    const second = await f.invoke(); assert.equal(second.code, 0, second.stdout + second.stderr);
    assert.equal((await f.data()).websiteActivations, 1);
    await fs.writeFile(f.root + '/website/changed.js', 'export const changed = true;');
    const third = await f.invoke(); assert.equal(third.code, 0, third.stdout + third.stderr);
    const data = await f.data(); assert.equal(data.websiteActivations, 2); assert.equal(data.websiteBuilds, 2);
    assert.equal(data.websiteInstalls, 1);
    for (const call of data.calls.filter(a => a[0] === 'compose' && a.includes('up'))) {
      assert.equal(call.at(-1), 'product-a-website-node');
      assert.ok(call.includes('--no-deps')); assert.ok(call.includes('--no-build'));
      assert.ok(!call.includes('--remove-orphans'));
    }
  } finally { await f.cleanup(); }
});
test('website activation failure stops without exposing raw output or reporting success', async () => {
  const f = await fixture({ websiteActivationFailure: true });
  try {
    const result = await f.invoke(); assert.equal(result.code, 1);
    assert.match(result.stderr, /Ativação do serviço website/);
    assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE-ACTIVATION|Website: http/);
    assert.equal((await f.data()).websiteActivations, 1);
    assert.equal(JSON.parse(await fs.readFile(f.root + '/.foundation-state.json', 'utf8')).phase, 'failed');
  } finally { await f.cleanup(); }
});
