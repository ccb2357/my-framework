import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
export async function checkBuild(directory = path.join(root, 'dist')) {
  const html = await fs.readFile(path.join(directory, 'index.html'), 'utf8');
  const buildId = html.match(/name="admin-build" content="(admin-[a-f0-9]{16})"/)?.[1];
  const entry = html.match(/src="\/(assets\/[\w.-]+\.js)"/)?.[1];
  if (!buildId || !entry || !html.includes('id="admin-app"') || /manifest|serviceworker|sw\.js/i.test(html)) throw new Error('HTML administrativo inválido ou com recursos PWA.');
  const files = ['index.html'];
  async function scan(relative) {
    for (const item of await fs.readdir(path.join(directory, relative), { withFileTypes: true })) {
      const file = relative ? relative + '/' + item.name : item.name;
      if (item.isSymbolicLink()) throw new Error('Symlink inesperado no build.');
      if (item.isDirectory()) { if (file !== 'assets') throw new Error('Diretório inesperado.'); await scan(file); }
      else if (file !== 'index.html') {
        if (!/^assets\/[\w.-]+\.(js|css)$/.test(file)) throw new Error('Artefato inesperado no build administrativo.');
        files.push(file);
        const body = await fs.readFile(path.join(directory, file), 'utf8');
        if (/framework7|workbox|navigator\.serviceWorker|serviceWorker\.register/.test(body)) throw new Error('Recurso da PWA no build administrativo.');
      }
    }
  }
  await scan('');
  if (!files.includes(entry) || !files.some(f => f.endsWith('.css'))) throw new Error('Artefatos administrativos incompletos.');
  return { buildId, entry, files: files.sort() };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const result = await checkBuild(); console.log(process.argv.includes('--json') ? JSON.stringify(result) : `Admin validado: ${result.buildId}.`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
