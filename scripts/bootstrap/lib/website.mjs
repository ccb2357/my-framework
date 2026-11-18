import fs from 'node:fs/promises';
import path from 'node:path';
import { frontendCommand, installFrontend } from './frontend.mjs';
import { docker, jsonOutput } from './process.mjs';
import { hash } from './files.mjs';
import { requireThat } from './errors.mjs';
export function websiteContext(c) { return { ...c, frontend: c.website, modulesVolume: c.websiteModulesVolume, websiteMode: true }; }
export async function websiteBuildId(c) {
  const parts = [c.PROJECT_NAME, c.PROJECT_SLUG, c.APP_LOCALE, c.websiteUrl, c.appUrl];
  async function collect(directory) {
    for (const item of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'nuxt.cmd') continue;
      const file = path.join(directory, item.name);
      if (item.isDirectory()) await collect(file);
      else if (item.isFile()) parts.push(path.relative(c.website, file), await fs.readFile(file, 'utf8'));
    }
  }
  await collect(c.website);
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
