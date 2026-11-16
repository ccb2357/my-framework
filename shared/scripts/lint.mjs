import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { spawnSync } from 'node:child_process';
const app = process.cwd();
const forms = fileURLToPath(new URL('../forms/', import.meta.url));
const files = fs.readdirSync(forms).filter(name => name.endsWith('.js')).map(name => path.join(forms, name));
const result = spawnSync(process.execPath, [
  path.join(app, 'node_modules/eslint/bin/eslint.js'), '--config', path.join(app, 'eslint.config.js'),
  ...files, fileURLToPath(import.meta.url),
], { cwd: path.dirname(app), stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
