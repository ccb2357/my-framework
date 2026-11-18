import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
export function checkBuild() {
  const manifest = JSON.parse(fs.readFileSync(new URL('../.foundation-build.json', import.meta.url), 'utf8'));
  if (!/^website-[a-f0-9]{16}$/.test(manifest.buildId) || !new RegExp('^' + manifest.buildId + '-[a-f0-9]{12}$').test(manifest.release)) throw new Error('Build website inválido.');
  const entry = new URL('../.releases/' + manifest.release + '/server/index.mjs', import.meta.url);
  if (!fs.existsSync(entry)) throw new Error('Servidor website ausente.');
  return { ...manifest, entry: fileURLToPath(entry) };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { buildId } = checkBuild();
  console.log(JSON.stringify({ buildId }));
}
