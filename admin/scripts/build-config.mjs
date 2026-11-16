import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function buildConfig(input) {
  const { name, slug, locale, appUrl, apiBase } = input.app || {};
  const { proxyTarget, proxyHost, devPort, previewPort } = input.vite || {};
  if ([name, slug, locale, appUrl, apiBase, proxyTarget, proxyHost].some(v => typeof v !== 'string' || !v) || apiBase !== '/api/v1' || ![devPort, previewPort].every(Number.isInteger)) throw new Error('Execute o bootstrap: configuração pública administrativa inválida.');
  return { app: { name, slug, locale, appUrl, apiBase }, vite: { proxyTarget, proxyHost, devPort, previewPort } };
}
export function buildIdentity(root, app) {
  const hash = crypto.createHash('sha256').update(JSON.stringify(app));
  function scan(directory) {
    for (const file of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(directory, file.name);
      if (file.isDirectory()) scan(target);
      else hash.update(path.relative(root, target)).update(fs.readFileSync(target));
    }
  }
  scan(path.join(root, 'src'));
  scan(path.join(root, '../shared/forms'));
  for (const file of ['index.html', 'package-lock.json', 'vite.config.js', 'scripts/build-config.mjs']) hash.update(fs.readFileSync(path.join(root, file)));
  return 'admin-' + hash.digest('hex').slice(0, 16);
}
