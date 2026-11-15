import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkBuild } from './check-build.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
export async function publishBuild(source = path.join(root, '.dist-build'), destination = path.join(root, 'dist')) {
  const build = await checkBuild(source);
  // Assets first; retain older hashed assets for tabs already open.
  for (const file of [...build.files.filter(f => f !== 'index.html'), 'index.html']) {
    const target = path.join(destination, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(source, file), target + '.publishing');
    await fs.rename(target + '.publishing', target);
  }
  await fs.rm(source, { recursive: true, force: true });
  return build;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`Admin publicado: ${(await publishBuild()).buildId}.`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
