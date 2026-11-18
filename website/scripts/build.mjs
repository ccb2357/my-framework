import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readConfiguration } from './config.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const config = readConfiguration();
const release = config.buildId + '-' + randomBytes(6).toString('hex');
const directory = path.join(root, '.releases', release);
const result = spawnSync(process.execPath, [path.join(root, 'node_modules/nuxt/bin/nuxt.mjs'), 'build'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, FOUNDATION_WEBSITE_OUTPUT: directory, NODE_ENV: 'production' },
});
if (result.error || result.status !== 0) process.exit(result.status || 1);
await fs.access(path.join(directory, 'server/index.mjs'));
await fs.access(path.join(directory, 'public'));
const manifest = path.join(root, '.foundation-build.json');
await fs.writeFile(manifest + '.tmp', JSON.stringify({ buildId: config.buildId, release }) + '\n');
await fs.rename(manifest + '.tmp', manifest);
console.log('Website compilado: ' + config.buildId + '. Reinicie somente seu serviço website para publicar.');
