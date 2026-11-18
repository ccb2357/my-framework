import fs from 'node:fs';
export function readConfiguration() {
  const source = JSON.parse(fs.readFileSync(new URL('../.foundation.public.json', import.meta.url), 'utf8'));
  const result = {};
  for (const key of ['name', 'slug', 'locale', 'websiteUrl', 'pwaUrl', 'buildId']) {
    if (typeof source[key] !== 'string' || !source[key]) throw new Error('Execute o bootstrap para preparar a configuração pública do website.');
    result[key] = source[key];
  }
  for (const key of ['websiteUrl', 'pwaUrl']) {
    const url = new URL(result[key]);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Origem pública inválida.');
  }
  return result;
}
