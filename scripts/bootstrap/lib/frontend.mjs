import fs from 'node:fs/promises';
import path from 'node:path';
import { docker, jsonOutput } from './process.mjs';
import { hash } from './files.mjs';
import { requireThat } from './errors.mjs';
export function frontendCommand(c, d, command) {
  return ['run', '--rm', '-i', '--network', c.DOCKER_NETWORK, '--workdir', '/app',
    '--mount', `type=bind,source=${d.mapping.toHost(c.frontend)},target=/app`,
    '--mount', `type=bind,source=${d.mapping.toHost(c.shared)},target=/shared,readonly`,
    '--mount', `type=volume,source=${c.modulesVolume},target=/app/node_modules`,
    '--env', 'npm_config_cache=/tmp/npm-cache', c.nodeImage || 'node:22-alpine', ...command];
}
export async function installFrontend(c, d) {
  const label = c.websiteMode ? 'website' : c.administrative ? 'admin' : 'PWA';
  const packageJson = await fs.readFile(path.join(c.frontend, 'package.json'), 'utf8');
  const lock = await fs.readFile(path.join(c.frontend, 'package-lock.json'), 'utf8');
  const manifest = JSON.parse(packageJson);
  requireThat(manifest.scripts?.dev && manifest.scripts?.build, 'Frontend precisa dos scripts dev e build.');
  const fingerprint = hash(packageJson + '\n' + lock + '\nnode22-include-dev' + (c.websiteMode ? '\n' + c.nodeImage : ''));
  const inspect = `const fs=require('node:fs');const p='node_modules/.foundation-lock';process.stdout.write(JSON.stringify({nodeVersion:process.versions.node,marker:fs.existsSync(p)?fs.readFileSync(p,'utf8').trim():'',metadata:fs.existsSync('node_modules/${c.websiteMode ? 'nuxt' : 'vite'}/package.json')&&fs.existsSync('node_modules/${c.websiteMode ? 'nuxt' : c.administrative ? 'reka-ui' : 'framework7-vue'}/package.json')}));`;
  const state = jsonOutput(await docker(frontendCommand(c, d, ['node', '-e', inspect]), { label: 'Estado efetivo node_modules' }), 'Estado node_modules');
  const version = String(state.nodeVersion || '').split('.').map(Number);
  requireThat(version[0] === 22 && version[1] >= 13, 'Frontend exige Node 22.13 ou superior na linha 22. Atualize a imagem node:22-alpine antes de repetir.');
  if (c.websiteMode) requireThat(version[0] === 22 && (version[1] > 22 || (version[1] === 22 && version[2] >= 3)), 'Website Nuxt exige Node 22.22.3 ou superior na linha 22. Atualize a imagem Node do website.');
  if (state.marker === fingerprint && state.metadata) { console.log(`Dependências ${label} inalteradas; instalação preservada.`); return fingerprint; }
  console.log(`Instalando dependências ${label} pelo package-lock.json.`);
  await docker(frontendCommand(c, d, ['npm', 'ci', '--include=dev', '--no-audit', '--no-fund']), { label: `Instalação ${label} npm ci`, timeout: 900000 });
  await docker(frontendCommand(c, d, ['node', '-e', "const fs=require('node:fs');fs.writeFileSync('node_modules/.foundation-lock',fs.readFileSync(0,'utf8')); "]), { input: fingerprint + '\n', label: 'Marcador node_modules' });
  return fingerprint;
}
export async function buildFrontend(c, d) {
  console.log('Compilando PWA e verificando seus artefatos.');
  await docker(frontendCommand(c, d, ['npm', 'run', 'build']), { label: 'Build PWA', timeout: 900000 });
  const result = jsonOutput(await docker(frontendCommand(c, d, ['node', 'scripts/check-pwa.mjs', '--json']), { label: 'Artefatos PWA' }), 'Artefatos PWA');
  requireThat(typeof result.buildId === 'string' && /^[a-z0-9.-]+$/.test(result.buildId) && Array.isArray(result.files) && result.files.length > 0, 'Build PWA sem identificação/arquivos válidos.');
  requireThat(result.files.every(f => typeof f === 'string' && /^(index\.html|offline\.html|manifest\.webmanifest|assets\/[\w.-]+\.(js|css|woff2?|ttf)|fonts\/[\w.-]+\.woff2|icons\/icon-(180|192|512)\.png)$/.test(f)), 'Artefatos PWA inesperados.');
  requireThat(result.files.includes(result.entry) && /^assets\/[\w.-]+\.js$/.test(result.entry), 'Entrada do build PWA inválida.');
  return result;
}

export function adminContext(c) {
  return { ...c, frontend: c.admin, modulesVolume: c.adminModulesVolume };
}
export async function installAdmin(c, d) {
  console.log('Preparando dependências administrativas.');
  return installFrontend({ ...adminContext(c), administrative: true }, d);
}
export async function buildAdmin(c, d) {
  const admin = adminContext(c);
  console.log('Compilando administrativo (sem PWA).');
  await docker(frontendCommand(admin, d, ['npm', 'run', 'build']), { label: 'Build admin', timeout: 900000 });
  const result = jsonOutput(await docker(frontendCommand(admin, d, ['node', 'scripts/check-build.mjs', '--json']), { label: 'Artefatos admin' }), 'Artefatos admin');
  requireThat(typeof result.buildId === 'string' && /^[a-z0-9.-]+$/.test(result.buildId) && /^assets\/[\w.-]+\.js$/.test(result.entry) && Array.isArray(result.files) && result.files.includes(result.entry) && result.files.every(f => /^(index\.html|assets\/[\w.-]+\.(js|css))$/.test(f)), 'Artefatos administrativos inválidos.');
  return result;
}
