import fs from 'node:fs';
export function readServerConfiguration() {
  const source = JSON.parse(fs.readFileSync(new URL('../.foundation.server.json', import.meta.url), 'utf8'));
  const config = {};
  for (const key of ['backendTarget', 'backendHost', 'websiteUrl', 'clientSessionCookie']) {
    if (typeof source[key] !== 'string' || !source[key]) throw new Error('Execute o bootstrap para preparar a configuração de servidor do website.');
    config[key] = source[key];
  }
  const target = new URL(config.backendTarget), website = new URL(config.websiteUrl);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.pathname !== '/' || target.search || target.hash || !['http:', 'https:'].includes(website.protocol) || website.username || website.password || config.backendHost !== website.host || !/^[a-z0-9_]+$/.test(config.clientSessionCookie)) throw new Error('Configuração do servidor website inválida.');
  config.devPort = Number(source.devPort);
  if (!Number.isInteger(config.devPort) || config.devPort < 1 || config.devPort > 65535) throw new Error('Porta website inválida.');
  return config;
}
