import fs from 'node:fs/promises';
import path from 'node:path';
import { frontendCommand, installFrontend } from './frontend.mjs';
import { docker, jsonOutput } from './process.mjs';
import { hash } from './files.mjs';
import { resolveBind } from './docker.mjs';
import { setTimeout } from 'node:timers/promises';
import { requireThat } from './errors.mjs';
export function websiteContext(c) { return { ...c, frontend: c.website, modulesVolume: c.websiteModulesVolume, websiteMode: true, nodeImage: 'node:22-bookworm-slim' }; }
export async function websiteBuildId(c) {
  const parts = [c.PROJECT_NAME, c.PROJECT_SLUG, c.APP_LOCALE, c.websiteUrl, c.appUrl, c.NGINX_INTERNAL_URL, c.WEBSITE_DEV_PORT, c.clientSessionCookie];
  async function collect(directory) {
    for (const item of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'nuxt.cmd') continue;
      const file = path.join(directory, item.name);
      if (item.isDirectory()) await collect(file);
      else if (item.isFile()) parts.push(path.relative(c.website, file), await fs.readFile(file, 'utf8'));
    }
  }
  await collect(c.website);
  await collect(path.join(c.shared, 'forms'));
  return 'website-' + hash(parts.join('\n')).slice(0, 16);
}
export async function prepareWebsite(c, d) {
  const context = websiteContext(c);
  const lock = await installFrontend(context, d);
  const current = await docker(frontendCommand(context, d, ['node', 'scripts/check-build.mjs']), { label: 'Build website existente', allowFailure: true });
  let build; try { build = JSON.parse(current.stdout); } catch { /* Initial installation. */ }
  if (build?.buildId !== c.websiteBuildId) {
    console.log('Compilando website Nuxt (SSR).');
    await docker(frontendCommand(context, d, ['npm', 'run', 'build']), { label: 'Build website', timeout: 900000 });
    build = jsonOutput(await docker(frontendCommand(context, d, ['node', 'scripts/check-build.mjs']), { label: 'Artefatos website' }), 'Artefatos website');
  }
  requireThat(build?.buildId === c.websiteBuildId, 'Build website inválido.');
  return { lock, buildId: build.buildId };
}

export function websiteActivation(c, d) {
  // Preserve the discovered Compose stack. Resolve binds against its HOST directory,
  // not the executor's /var/www path (important for relative mounts on Windows).
  const volumes = (d.config.services[c.websiteService].volumes || []).map(volume => {
    if (volume.type !== 'bind') return volume;
    return { ...volume, source: resolveBind(volume.source, d).replaceAll('$', () => '$$') };
  });
  return {
    argv: [...d.prefix, '-f', '-', 'up', '-d', '--no-deps', '--no-build', '--force-recreate', c.websiteService],
    input: JSON.stringify({ services: { [c.websiteService]: { volumes } } }),
  };
}
async function websiteEvidence(c, d, buildId) {
  const result = await docker(['exec', '-i', '--workdir', c.backend, d.php.Id, 'php', path.join(c.root, 'scripts/bootstrap/php/verify-website.php')], {
    input: JSON.stringify({ url: c.websiteUrl, target: c.NGINX_INTERNAL_URL, environment: c.APP_ENV, buildId }), label: 'HTTP website', allowFailure: true,
  });
  try {
    const evidence = JSON.parse(result.stdout);
    return result.code === 0 && evidence.status === 'ok' ? evidence : null;
  } catch { return null; }
}
export async function activateWebsite(c, d, buildId) {
  const current = await websiteEvidence(c, d, buildId);
  if (current) return current;
  console.log('Iniciando/atualizando somente o serviço website.');
  const activation = websiteActivation(c, d);
  await docker(activation.argv, { input: activation.input, cwd: d.directory, label: 'Ativação do serviço website', timeout: 300000 });
  for (let attempt = 0; attempt < 30; attempt++) {
    if (attempt) await setTimeout(1000);
    const evidence = await websiteEvidence(c, d, buildId);
    if (evidence) return evidence;
  }
  requireThat(false, 'Website não respondeu com o build esperado após iniciar. Confira o serviço website e o Nginx; nenhum outro serviço foi reiniciado.');
}
