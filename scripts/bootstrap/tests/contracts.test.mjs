import { websiteBuildId } from '../lib/website.mjs';
import { websiteActivation } from '../lib/website.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseCentral, validate, args, contained } from '../lib/config.mjs';
import { mapPath, mappedPaths, infraProblems, sameHost } from '../lib/docker.mjs';
import { managedEnv, synchronizeEnvs, appKey, checkIdentity, identity, writeAtomic } from '../lib/files.mjs';
import { composeSnippet, nginxSnippet, siteApplied, viteCmd, publicConfiguration, adminPublicConfiguration, websiteNginxSnippet, websitePublicConfiguration, nuxtCmd } from '../lib/templates.mjs';
import { run } from '../lib/process.mjs';
import { httpFailure } from '../lib/errors.mjs';
const raw = await fs.readFile(new URL('../../../.env.foundation.example', import.meta.url), 'utf8');
// Keep test identity independent of the names chosen for the installation example.
const input = { ...parseCentral(raw), WEBSITE_LOCAL_DOMAIN: '', PROJECT_SLUG: 'pwa-teste', LOCAL_DOMAIN: 'pwa-teste.localhost', DEV_PORT: '5176', PREVIEW_PORT: '5177', DB_DATABASE: 'pwa_teste', DB_TEST_DATABASE: 'pwa_teste_test' };
const config = changes => validate({ ...input, ...changes }, '/var/www/pwa-teste');
test('HTTP failures show only controlled diagnostics and discard private output', () => {
  const output = httpFailure(JSON.stringify({ status: 'error', reason: 'html-contract', path: '/status', http_status: 200, curl_errno: 0, origin_index: 0, body: 'PRIVATE-BODY', cookies: 'PRIVATE-COOKIE' }));
  assert.match(output, /\/status/); assert.match(output, /HTML/); assert.match(output, /HTTP 200/);
  assert.doesNotMatch(output, /PRIVATE/);
  for (const value of ['PRIVATE-ERROR', JSON.stringify({ status: 'error', reason: 'PRIVATE-ERROR' }), JSON.stringify({ status: 'error', reason: 'no-store', path: 'PRIVATE-PATH', http_status: 'PRIVATE-STATUS' })]) {
    assert.doesNotMatch(httpFailure(value), /PRIVATE/);
  }
});
const d = {
  project: 'infra', directory: '/var/www/infra', hostDir: 'C:\\var\\www\\infra', internalFiles: ['/var/www/infra/docker-compose.yml'],
  mapping: { toHost: x => mapPath(x, '/var/www', 'C:\\var\\www') },
};
test('dotenv preserves special characters without expansion or execution', () => {
  const values = parseCentral('DB_PASSWORD="a b$HOME#c=;`$(command)"\nPROJECT_NAME=Teste\n');
  assert.equal(values.DB_PASSWORD, 'a b$HOME#c=;`$(command)');
  assert.throws(() => parseCentral('APP_ENV=local\nAPP_ENV=production\n'));
  assert.throws(() => parseCentral('APP_ENV="unterminated\n'));
});
test('environment and identity cannot fall back silently', () => {
  assert.throws(() => config({ APP_ENV: '' }));
  assert.throws(() => config({ APP_ENV: 'staging' }));
  assert.throws(() => config({ PROJECT_SLUG: 'other' }));
  assert.equal(config().nodeService, 'pwa-teste-node');
  assert.equal(config().frontend, '/var/www/pwa-teste/pwa');
  assert.equal(config().modulesVolume, 'pwa_teste_node_modules');
  checkIdentity({ identity: { slug: 'pwa-teste', root: '/var/www/pwa-teste', database: 'pwa_teste', testDatabase: 'pwa_teste_test', vendor: 'pwa_teste_vendor', modules: 'pwa_teste_node_modules' } }, config());
});
test('production requires HTTPS origin and derives secure stateful host', () => {
  assert.throws(() => config({ APP_ENV: 'production', PRODUCTION_URL: 'http://example.com' }));
  assert.throws(() => config({ APP_ENV: 'production', PRODUCTION_URL: 'https://example.com/subpath' }));
  const c = config({ APP_ENV: 'production', PRODUCTION_URL: 'https://example.com' });
  assert.equal(c.appUrl, 'https://example.com'); assert.ok(c.stateful.split(',').includes('example.com')); assert.ok(c.stateful.split(',').includes('website.example.com'));
});
test('test database collision is rejected, including case-only difference', () => {
  assert.throws(() => config({ DB_TEST_DATABASE: 'PWA_TESTE' }));
  assert.equal(config({ DB_TEST_DATABASE: '' }).DB_TEST_DATABASE, 'pwa_teste_test');
  assert.throws(() => config({ DB_DATABASE: 'bad`;DROP' }));
});
test('ports must be valid and distinct', () => {
  assert.throws(() => config({ DEV_PORT: '5177' }));
  assert.throws(() => config({ DEV_PORT: '65536' }));
  assert.throws(() => config({ DEV_PORT: '5176x' }));
});
test('Windows/Linux host mapping preserves spaces and prevents traversal', () => {
  assert.equal(mapPath('/var/www/my project/a', '/var/www', 'C:\\var\\www'), 'C:\\var\\www\\my project\\a');
  assert.equal(mapPath('C:\\var\\www\\my project\\a', 'C:\\var\\www', '/var/www'), '/var/www/my project/a');
  assert.equal(mapPath('/srv/apps/a', '/srv/apps', '/var/www'), '/var/www/a');
  assert.throws(() => mapPath('C:\\other\\a', 'C:\\var\\www', '/var/www'));
  assert.throws(() => mapPath('/var/www-other/a', '/var/www', '/srv/apps'));
});
test('effective mount mapping is mandatory', () => {
  assert.throws(() => mappedPaths({ Mounts: [] }, config()));
  const result = mappedPaths({ Mounts: [{ Type: 'bind', Source: 'C:\\var\\www', Destination: '/var/www' }] }, config());
  assert.equal(result.toHost('/var/www/pwa-teste'), 'C:\\var\\www\\pwa-teste');
});
test('Docker Desktop mount aliases match Windows Compose labels without escaping the root', () => {
  const source = '/run/desktop/mnt/host/c/var/www';
  const mapping = mappedPaths({ Mounts: [{ Type: 'bind', Source: source, Destination: '/var/www' }] }, config());
  assert.equal(mapping.toInternal('C:\\var\\www\\infra\\docker-compose.yml'), '/var/www/infra/docker-compose.yml');
  assert.equal(mapping.toInternal(source + '/infra/docker-compose.yml'), '/var/www/infra/docker-compose.yml');
  assert.equal(mapping.toHost('/var/www/pwa-teste/pwa'), 'C:\\var\\www\\pwa-teste\\pwa');
  assert.equal(sameHost(source, 'C:\\var\\www'), true);
  assert.equal(sameHost('C:\\var\\www', source), true);
  assert.equal(sameHost(source, 'D:\\var\\www'), false);
  assert.equal(sameHost(source, '/var/www'), false);
  assert.throws(() => mapping.toInternal('C:\\var\\other\\file'));
  assert.throws(() => mapping.toInternal(source + '/../other/file'));
});
test('central target cannot escape through symlink', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'foundation-containment-'));
  try {
    await fs.mkdir(temp + '/allowed'); await fs.mkdir(temp + '/outside'); await fs.symlink(temp + '/outside', temp + '/allowed/escape');
    await assert.rejects(contained(temp + '/allowed/escape', temp + '/allowed'));
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
});
test('valid app key is preserved and invalid existing key is not regenerated', () => {
  const key = appKey(''); assert.equal(appKey('APP_KEY=' + key), key);
  assert.equal(appKey('APP_KEY=abcdefghijklmnopqrstuvwxyz123456'), 'abcdefghijklmnopqrstuvwxyz123456');
  assert.throws(() => appKey('APP_KEY=invalid'));
});
test('managed env preserves product settings and reexecution is stable', () => {
  const first = managedEnv('PRODUCT_SETTING=keep\nAPP_ENV=old\n', { APP_ENV: 'local', DB_PASSWORD: 'a b$"\\#' });
  assert.match(first, /PRODUCT_SETTING=keep/); assert.doesNotMatch(first, /APP_ENV=old/);
  assert.equal(managedEnv(first, { APP_ENV: 'local', DB_PASSWORD: 'a b$"\\#' }), first);
});
test('initialized identity changes require explicit migration', () => {
  const c = config(), state = { identity: identity(c) }; checkIdentity(state, c);
  assert.throws(() => checkIdentity(state, config({ DB_DATABASE: 'another' })));
});
test('generated infrastructure is credential-free and restricted to the clone', () => {
  const c = config({ DB_PASSWORD: 'UNIQUE-SECRET' });
  const snippets = composeSnippet(c, d) + nginxSnippet(c);
  assert.doesNotMatch(snippets, /UNIQUE-SECRET/);
  assert.match(snippets, /pwa_teste_vendor/); assert.match(snippets, /127\.0\.0\.1:5176:5173/);
  assert.match(snippets, /C:\/var\/www\/pwa-teste\/pwa/);
});
test('Nginx validation checks actual config rather than marker alone', () => {
  const c = config(); assert.equal(siteApplied('# PWA FOUNDATION: pwa-teste', c), false);
  assert.equal(siteApplied(nginxSnippet(c) + nginxSnippet(c, true) + websiteNginxSnippet(c), c), true);
  assert.equal(siteApplied(nginxSnippet(c).replace('php-fpm:9000', 'wrong:9000'), c), false);
  assert.equal(siteApplied((nginxSnippet(c) + nginxSnippet(c, true) + websiteNginxSnippet(c)).replace('/pwa/dist', '/frontend/dist'), c), false);
});
test('Windows shortcut preserves shared Compose identity and exit code', () => {
  const output = viteCmd(config(), d); assert.match(output, /-p infra/); assert.match(output, /%~dp0/); assert.match(output, /exit \/b %errorlevel%/);
  assert.match(output, /--service-ports pwa-teste-node npm run dev/);
  assert.doesNotMatch(output.split(':build')[1], /--service-ports/);
});
test('initial absence reports infra pending instead of installing', () => {
  const problems = infraProblems(config(), { ...d, config: { services: {} }, php: { Mounts: [] }, nginx: { Mounts: [] } });
  assert.ok(problems.some(x => x.includes('pwa-teste-node'))); assert.ok(problems.some(x => x.includes('vendor')));
});
test('CLI only accepts explicit target and narrow force option', () => {
  assert.deepEqual(args(['--project', '/var/www/pwa-teste', '--force']), { force: true, project: '/var/www/pwa-teste' });
  assert.throws(() => args(['--env', 'production'])); assert.throws(() => args(['--project', '../escape']));
});
test('process failures do not print stdout, secrets, or arbitrary shell content', async () => {
  await assert.rejects(run(process.execPath, ['-e', 'console.error("UNIQUE-PRIVATE-VALUE");process.exit(9)'], { label: 'Processo de teste' }), error => !error.message.includes('UNIQUE-PRIVATE-VALUE') && error.message.includes('9'));
});
test('atomic writes avoid unnecessary replacement', async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'foundation-write-'));
  try { assert.equal(await writeAtomic(folder + '/x', 'value'), true); assert.equal(await writeAtomic(folder + '/x', 'value'), false); }
  finally { await fs.rm(folder, { recursive: true, force: true }); }
});

test('public config excludes credentials and keeps proxy details out of the browser app fields', () => {
  const output = publicConfiguration(config({ DB_PASSWORD: 'PRIVATE-DATABASE' }));
  assert.doesNotMatch(JSON.stringify(output), /PRIVATE-DATABASE|DB_USERNAME|DB_PASSWORD/);
  assert.equal(output.app.apiBase, '/api/v1');
  assert.equal(output.app.locale, 'pt-BR');
  assert.equal(output.app.proxyTarget, undefined);
});

test('PWA Nginx separates backend routes, mutable entrypoints and immutable assets', () => {
  const site = nginxSnippet(config());
  assert.match(site, /root "\/var\/www\/pwa-teste\/pwa\/dist"/);
  assert.match(site, /api\|sanctum\|up\|status/);
  assert.match(site, /internal;/); assert.match(site, /SCRIPT_FILENAME "\/var\/www\/pwa-teste\/backend\/public\/index.php"/);
  assert.match(site, /location = \/sw.js[^}]+no-cache/);
  assert.match(site, /location \/assets\/[^}]+immutable/);
  assert.doesNotMatch(site, /return 302 \/status/);
});

test('admin origins and four ports are distinct and production admin requires HTTPS', () => {
  const c = config();
  assert.equal(c.adminUrl, 'http://admin.pwa-teste.localhost');
  assert.equal(c.adminNodeService, 'pwa-teste-admin-node');
  assert.equal(c.adminModulesVolume, 'pwa_teste_admin_node_modules');
  assert.throws(() => config({ ADMIN_DEV_PORT: input.DEV_PORT }));
  assert.throws(() => config({ ADMIN_PREVIEW_PORT: '5182' }));
  assert.throws(() => config({ ADMIN_LOCAL_DOMAIN: input.LOCAL_DOMAIN }));
  assert.throws(() => config({ ADMIN_LOCAL_DOMAIN: 'bad;server' }));
  for (const url of ['http://admin.example.com', 'https://example.com', 'https://admin.example.com/path', 'https://user:pass@admin.example.com']) {
    assert.throws(() => config({ APP_ENV: 'production', PRODUCTION_URL: 'https://example.com', ADMIN_PRODUCTION_URL: url }));
  }
  assert.equal(config({ APP_ENV: 'production', PRODUCTION_URL: 'https://example.com' }).adminUrl, 'https://admin.example.com');
});
test('admin public config and Nginx exclude PWA resources and private credentials', () => {
  const c = config({ DB_PASSWORD: 'PRIVATE-SECRET' });
  const output = adminPublicConfiguration(c), site = nginxSnippet(c, true);
  assert.doesNotMatch(JSON.stringify(output), /PRIVATE|PWA_THEME|SESSION|DB_PASSWORD/);
  assert.equal(output.app.appUrl, c.adminUrl);
  assert.equal(output.vite.proxyHost, 'admin.pwa-teste.localhost');
  assert.match(site, /root "\/var\/www\/pwa-teste\/admin\/dist"/);
  assert.match(site, /location = \/sw.js \{ return 404; \}/);
  assert.match(site, /location = \/manifest.webmanifest \{ return 404; \}/);
  assert.doesNotMatch(site, /Service-Worker-Allowed|pwa\/dist/);
  assert.match(site, /backend\/public\/index.php/);
  assert.equal(siteApplied(nginxSnippet(c), c), false);
  assert.equal(siteApplied(nginxSnippet(c) + site + websiteNginxSnippet(c), c), true);
  const shortcut = viteCmd(c, d, true);
  assert.match(shortcut, /--service-ports pwa-teste-admin-node/);
  assert.doesNotMatch(shortcut, /--service-ports pwa-teste-node /);
});

test('npm manifests pin direct versions and lockfiles agree, including shared form libraries', async () => {
  const manifests = [];
  for (const directory of ['pwa', 'admin', 'scripts/bootstrap/executor', 'website']) {
    const base = new URL('../../../' + directory + '/', import.meta.url);
    const manifest = JSON.parse(await fs.readFile(new URL('package.json', base), 'utf8'));
    const lock = JSON.parse(await fs.readFile(new URL('package-lock.json', base), 'utf8'));
    for (const group of ['dependencies', 'devDependencies']) {
      assert.deepEqual(lock.packages[''][group] || {}, manifest[group] || {}, directory + ' lockfile desatualizado');
      for (const [name, version] of Object.entries(manifest[group] || {})) {
        assert.match(version, /^\d+\.\d+\.\d+$/, directory + ': ' + name);
        assert.equal(lock.packages['node_modules/' + name]?.version, version, directory + ': ' + name);
      }
    }
    manifests.push(manifest);
  }
  for (const name of ['imask', 'just-validate']) { assert.equal(manifests[0].dependencies[name], manifests[1].dependencies[name]); assert.equal(manifests[0].dependencies[name], manifests[3].dependencies[name]); }
});

test('backend admin context is derived from central without admitting client ports or exposing secrets', async () => {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'admin-context-'));
 try {
  const c=config({ ADMIN_DEV_PORT:'5182', ADMIN_PREVIEW_PORT:'5183' }); c.backend=root+'/backend';
  await synchronizeEnvs(c);
  const { parseDotenv }=await import('../lib/config.mjs');
  const env=parseDotenv(await fs.readFile(c.backend+'/.env','utf8'));
  assert.equal(env.ADMIN_URL,c.adminUrl);
  assert.ok(env.ADMIN_STATEFUL_DOMAINS.includes('localhost:5182'));
  assert.ok(!env.ADMIN_STATEFUL_DOMAINS.includes('localhost:5176'));
  assert.ok(!env.ADMIN_STATEFUL_DOMAINS.includes('localhost:5177'));
  assert.equal(env.SESSION_DOMAIN,'null');
 } finally { await fs.rm(root,{recursive:true,force:true}); }
});


test('SMTP stays private, requires valid configuration and never enables real mail in testing',async()=>{
 assert.throws(()=>config({SMTP_HOST:'smtp.gmail.com',SMTP_USER:'sender@gmail.com',SMTP_PASS:''}));
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'smtp-private-'));
 try {
  const c=config({SMTP_HOST:'smtp.gmail.com',SMTP_USER:'sender@gmail.com',SMTP_PASS:'PRIVATE-SMTP'});c.backend=root+'/backend';await synchronizeEnvs(c);
  const real=await fs.readFile(c.backend+'/.env','utf8'),testing=await fs.readFile(c.backend+'/.env.testing','utf8');
  assert.match(real,/MAIL_MAILER="smtp"/);assert.match(real,/MAIL_PASSWORD="PRIVATE-SMTP"/);assert.match(testing,/MAIL_MAILER="array"/);assert.doesNotMatch(testing,/PRIVATE-SMTP/);
  assert.doesNotMatch(JSON.stringify(publicConfiguration(c))+JSON.stringify(adminPublicConfiguration(c)),/PRIVATE-SMTP|sender@gmail.com/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('website has a distinct origin, exact ports and public-only generated configuration', () => {
  for (const changes of [{ WEBSITE_DEV_PORT: '5182' }, { WEBSITE_LOCAL_DOMAIN: input.LOCAL_DOMAIN }, { WEBSITE_LOCAL_DOMAIN: 'admin.pwa-teste.localhost' }, { APP_ENV: 'production', PRODUCTION_URL: 'https://example.com', WEBSITE_PRODUCTION_URL: 'http://shop.example.com' }]) assert.throws(() => config(changes));
  const c = config({ DB_PASSWORD: 'PRIVATE-WEBSITE-SECRET', WEBSITE_LOCAL_DOMAIN: 'example.pwa-teste.localhost' });
  const output = websitePublicConfiguration({ ...c, websiteBuildId: 'website-fixture' });
  assert.equal(output.websiteUrl, 'http://example.pwa-teste.localhost');
  assert.doesNotMatch(JSON.stringify(output), /PRIVATE|DB_|SMTP|proxy/);
  const site = websiteNginxSnippet(c);
  assert.match(site, /resolver 127.0.0.11/);
  assert.match(site, /pwa-teste-website-node:3000/);
  assert.match(site, /proxy_pass http:\/\/\$website_upstream/);
  assert.doesNotMatch(site, /pwa\/dist|admin\/dist/);
  const shortcut = nuxtCmd(c, d);
  assert.match(shortcut, /-e NODE_ENV=development -p 127.0.0.1:5184:3000/);
  assert.match(shortcut, /--profile website/);
  assert.match(shortcut, /exit \/b %errorlevel%/);
});

test('website activation preserves Compose identity and resolves only its binds on the host', () => {
  const c = config();
  const discovery = { ...d, prefix: ['compose', '-p', 'infra', '-f', '/var/www/infra/docker-compose.yml', '--profile', 'website'], config: { services: { [c.websiteService]: { volumes: [
    { type: 'bind', source: '../pwa-teste/website', target: '/app' },
    { type: 'volume', source: c.websiteModulesVolume, target: '/app/node_modules' },
  ] } } } };
  const result = websiteActivation(c, discovery);
  assert.deepEqual(result.argv.slice(0, discovery.prefix.length), discovery.prefix);
  assert.deepEqual(result.argv.slice(discovery.prefix.length), ['-f', '-', 'up', '-d', '--no-deps', '--no-build', '--force-recreate', c.websiteService]);
  const model = JSON.parse(result.input);
  assert.deepEqual(Object.keys(model.services), [c.websiteService]);
  assert.equal(model.services[c.websiteService].volumes[0].source, 'C:\\var\\www\\pwa-teste\\website');
  assert.equal(model.services[c.websiteService].volumes[1].source, c.websiteModulesVolume);
  const special = { ...discovery, hostDir: 'C:\\apps$private\\infra' };
  assert.match(JSON.parse(websiteActivation(c, special).input).services[c.websiteService].volumes[0].source, /apps\$\$private/);
  const linux = { ...discovery, hostDir: '/srv/apps/infra' };
  assert.equal(JSON.parse(websiteActivation(c, linux).input).services[c.websiteService].volumes[0].source, '/srv/apps/pwa-teste/website');
});

test('website build identity includes shared form sources but not private root files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'website-shared-id-'));
  try {
    await fs.mkdir(root + '/website'); await fs.mkdir(root + '/shared/forms', { recursive: true });
    await fs.writeFile(root + '/website/package.json', '{}');
    await fs.writeFile(root + '/shared/forms/messages.pt-BR.json', '{"required":"A"}');
    const c = { ...config(), website: root + '/website', shared: root + '/shared' };
    const before = await websiteBuildId(c);
    await fs.writeFile(root + '/shared/forms/messages.pt-BR.json', '{"required":"B"}');
    const after = await websiteBuildId(c); assert.notEqual(after, before);
    await fs.writeFile(root + '/.env.foundation', 'DB_PASSWORD=PRIVATE-IGNORED');
    assert.equal(await websiteBuildId(c), after);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('client cookie scope rejects public suffixes and unrelated domains but supports sibling subdomains', () => {
 const local=config(); assert.equal(local.CLIENT_SESSION_DOMAIN,'pwa-teste.localhost');
 for(const changes of [{WEBSITE_LOCAL_DOMAIN:'foreign.localhost'},{CLIENT_SESSION_DOMAIN:'localhost'},{APP_ENV:'production',PRODUCTION_URL:'https://app.example.co.uk',WEBSITE_PRODUCTION_URL:'https://example.co.uk',CLIENT_SESSION_DOMAIN:'co.uk'},{APP_ENV:'production',PRODUCTION_URL:'https://app.example.com',WEBSITE_PRODUCTION_URL:'https://other.com'}])assert.throws(()=>config(changes));
 const prod=config({APP_ENV:'production',PRODUCTION_URL:'https://app.example.co.uk',WEBSITE_PRODUCTION_URL:'https://www.example.co.uk'});assert.equal(prod.CLIENT_SESSION_DOMAIN,'example.co.uk');assert.equal(prod.clientSessionCookie,'pwa_teste_session_client');
});


test('shared certificate is generated and checked for all production interfaces', () => {
  const c = config({ APP_ENV: 'production', PRODUCTION_URL: 'https://www.app.example.com', ADMIN_PRODUCTION_URL: 'https://www.admin.example.com', WEBSITE_PRODUCTION_URL: 'https://www.website.example.com', NGINX_CERT_NAME: 'shared-example.com' });
  const sites = [nginxSnippet(c), nginxSnippet(c, true), websiteNginxSnippet(c)];
  for (const site of sites) {
    assert.match(site, /ssl_certificate \/etc\/letsencrypt\/live\/shared-example.com\/fullchain.pem;/);
    assert.match(site, /ssl_certificate_key \/etc\/letsencrypt\/live\/shared-example.com\/privkey.pem;/);
  }
  const output = sites.join('\n');
  assert.equal(siteApplied(output, c), true);
  assert.equal(siteApplied(output.replace('shared-example.com/fullchain.pem', 'wrong/fullchain.pem'), c), false);
  assert.equal(siteApplied(output.replace('/backend/public/index.php', '/wrong/index.php'), c), false);
  for (const site of [nginxSnippet(config({ APP_ENV: 'production', PRODUCTION_URL: 'https://example.com' })), nginxSnippet(config({ APP_ENV: 'production', PRODUCTION_URL: 'https://example.com' }), true), websiteNginxSnippet(config({ APP_ENV: 'production', PRODUCTION_URL: 'https://example.com' }))]) {
    assert.doesNotMatch(site, /shared-example/);
    assert.match(site, /ssl_certificate \/etc\/letsencrypt\/live\/(?:admin\.|website\.)?example.com\/fullchain.pem;/);
  }
  assert.doesNotMatch(nginxSnippet(config({ NGINX_CERT_NAME: 'shared-example.com' })), /ssl_certificate/);
  assert.doesNotMatch(JSON.stringify(publicConfiguration(c)) + JSON.stringify(adminPublicConfiguration(c)) + JSON.stringify(websitePublicConfiguration(c)), /NGINX_CERT_NAME|shared-example.com/);
  for (const name of ['../escape', '/tmp/cert', 'a/b', 'a\\b', 'a;return', 'a b', 'a\nssl']) assert.throws(() => config({ NGINX_CERT_NAME: name }));
});
