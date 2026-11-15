import path from 'node:path';
import { readOptional, writeAtomic } from './files.mjs';
import { requireThat } from './errors.mjs';
const q = JSON.stringify;
const yamlPath = value => {
  const normalized = value.replaceAll('\\', '/');
  return /^[A-Za-z0-9_./: -]+$/.test(normalized) ? normalized : q(normalized);
};
export function composeSnippet(c, d) {
  const service = (name, directory, volume, port) => `    ${name}:
        image: node:22-alpine
        working_dir: /app
        volumes:
            - type: bind
              source: ${yamlPath(d.mapping.toHost(directory))}
              target: /app
            - ${volume}:/app/node_modules
        ports:
            - "127.0.0.1:${port}:5173"
        networks:
            - ${c.DOCKER_NETWORK}
        profiles:
            - dev
`;
  return `# Mesclar no Compose existente.
services:
${service(c.nodeService, c.frontend, c.modulesVolume, c.DEV_PORT)}${service(c.adminNodeService, c.admin, c.adminModulesVolume, c.ADMIN_DEV_PORT)}    ${c.PHP_SERVICE}:
        volumes:
            # Acrescentar aos mounts existentes:
            - ${c.vendorVolume}:${c.backend}/vendor
volumes:
${[c.vendorVolume, c.modulesVolume, c.adminModulesVolume].map(name => `    ${name}:
        name: ${name}
`).join('')}`;
}
export function nginxSnippet(c, administrative = false) {
  const host = administrative ? new URL(c.adminUrl).hostname : new URL(c.appUrl).hostname;
  const directory = administrative ? c.admin : c.frontend;
  const common = `    server_name ${host};
    root ${q(directory + '/dist')};
    index index.html;
    charset utf-8;
    add_header Cache-Control "no-cache" always;

    ${administrative ? 'location = /sw.js { return 404; }\n    location = /manifest.webmanifest { return 404; }\n    location = /offline.html { return 404; }' : 'location = /sw.js { try_files $uri =404; add_header Cache-Control "no-cache" always; add_header Service-Worker-Allowed "/"; }\n    location = /manifest.webmanifest { types { application/manifest+json webmanifest; } try_files $uri =404; add_header Cache-Control "no-cache" always; }'}
    location = /index.html { try_files $uri =404; add_header Cache-Control "no-cache" always; }
    location /assets/ { try_files $uri =404; add_header Cache-Control "public, max-age=31536000, immutable"; }
    location ~ /\\. { deny all; }
    location ~ ^/(api|sanctum|up|status)(/|$) { rewrite ^ /index.php last; }
    location = /index.php {
        internal;
        include fastcgi_params;
        fastcgi_pass ${c.PHP_SERVICE}:9000;
        fastcgi_param SCRIPT_FILENAME ${q(c.backend + '/public/index.php')};
        fastcgi_param DOCUMENT_ROOT ${q(c.backend + '/public')};
        ${c.APP_ENV === 'production' ? 'fastcgi_param HTTPS on;' : ''}
        add_header Cache-Control "no-store" always;
    }
    location ~* \\.php(/|$) { return 404; }
    location / { try_files $uri $uri/ /index.html; }
`;
  const marker = '# ' + (administrative ? 'ADMIN' : 'PWA') + ' FOUNDATION: ' + c.PROJECT_SLUG + '\n';
  if (c.APP_ENV === 'local') return marker + `server {\n    listen 80;\n${common}}\n`;
  return marker + `# Conferir certificados reais antes de aplicar.\nserver {\n    listen 80;\n    server_name ${host};\n    location /.well-known/acme-challenge/ { root /var/www/certbot; }\n    location / { return 301 https://$host$request_uri; }\n}\nserver {\n    listen 443 ssl;\n    ssl_certificate /etc/letsencrypt/live/${host}/fullchain.pem;\n    ssl_certificate_key /etc/letsencrypt/live/${host}/privkey.pem;\n${common}}\n`;
}
export function viteCmd(c, d, administrative = false) {
  const directory = administrative ? c.admin : c.frontend;
  const service = administrative ? c.adminNodeService : c.nodeService;
  const cmdPath = value => {
    const relative = path.relative(directory, value).split(path.sep).join('\\');
    requireThat(!/["\r\n]/.test(relative), 'Caminho inválido para atalho CMD.');
    return '%~dp0' + relative.replaceAll('%', '%%');
  };
  const flags = `-p ${d.project} --project-directory "${cmdPath(d.directory)}" ${d.internalFiles.map(file => `-f "${cmdPath(file)}"`).join(' ')} --profile dev`;
  return `@echo off\r\nsetlocal DisableDelayedExpansion\r\nif /I "%~1"=="dev" goto dev\r\nif /I "%~1"=="build" goto build\r\necho Use: vite dev ou vite build\r\nexit /b 1\r\n:dev\r\ndocker compose ${flags} run --rm --no-deps --service-ports ${service} npm run dev\r\nexit /b %errorlevel%\r\n:build\r\ndocker compose ${flags} run --rm --no-deps ${service} npm run build\r\nexit /b %errorlevel%\r\n`;
}
export function publicConfiguration(c) {
  return {
    app: { name: c.PROJECT_NAME, slug: c.PROJECT_SLUG, locale: c.APP_LOCALE.replace('_', '-'), displayTimezone: c.DISPLAY_TIMEZONE, appUrl: c.appUrl, apiBase: '/api/v1', themeColor: c.PWA_THEME_COLOR, shortName: c.PWA_SHORT_NAME, description: c.PWA_DESCRIPTION, backgroundColor: c.PWA_BACKGROUND_COLOR },
    vite: { proxyTarget: c.NGINX_INTERNAL_URL, proxyHost: new URL(c.appUrl).host, devPort: c.DEV_PORT, previewPort: c.PREVIEW_PORT },
  };
}
export function adminPublicConfiguration(c) {
  return {
    app: { name: c.PROJECT_NAME + ' · Admin', slug: c.PROJECT_SLUG, locale: c.APP_LOCALE.replace('_', '-'), appUrl: c.adminUrl, apiBase: '/api/v1' },
    vite: { proxyTarget: c.NGINX_INTERNAL_URL, proxyHost: new URL(c.adminUrl).host, devPort: c.ADMIN_DEV_PORT, previewPort: c.ADMIN_PREVIEW_PORT },
  };
}
export async function generate(c, d) {
  await writeAtomic(path.join(c.admin, '.foundation.public.json'), JSON.stringify(adminPublicConfiguration(c), null, 2) + '\n');
  await writeAtomic(path.join(c.admin, 'vite.cmd'), viteCmd(c, d, true));
  await writeAtomic(path.join(c.frontend, '.foundation.public.json'), JSON.stringify(publicConfiguration(c), null, 2) + '\n');
  const guidePath = path.join(c.root, 'instalacao-pwa-framework.md');
  const guide = await readOptional(guidePath);
  const infraBlock = /<!-- BEGIN FOUNDATION INSTALL INFRA -->[\s\S]*?<!-- END FOUNDATION INSTALL INFRA -->/;
  requireThat(infraBlock.test(guide), 'instalacao-pwa-framework.md ausente ou sem bloco gerenciado. Restaure o guia da entrega antes de executar o bootstrap.');
  await writeAtomic(guidePath, guide.replace(infraBlock, () => installationInfra(c, d)));
  const file = path.join(c.frontend, 'vite.cmd');
  await writeAtomic(file, viteCmd(c, d));
  const summary = `<!-- BEGIN FOUNDATION IDENTITY -->\n| Campo | Valor |\n| --- | --- |\n| Projeto | ${c.PROJECT_NAME.replaceAll('|', '\\|')} |\n| Slug | ${c.PROJECT_SLUG} |\n| Ambiente | ${c.APP_ENV} |\n| URL | ${c.appUrl} |\n| Dev / preview | ${c.DEV_PORT} / ${c.PREVIEW_PORT} |\n| Serviço / Compose | ${c.nodeService} / ${d.project} |\n| Volumes | ${c.vendorVolume}, ${c.modulesVolume} |\n| Bancos | ${c.DB_DATABASE}, ${c.DB_TEST_DATABASE} |\n| Admin | ${c.adminUrl} |\n| Admin dev / preview | ${c.ADMIN_DEV_PORT} / ${c.ADMIN_PREVIEW_PORT} |\n| Fundação | 0.7.0-admin.1 |\n<!-- END FOUNDATION IDENTITY -->`;
  const readmePath = path.join(c.root, 'README.md'), readme = await readOptional(readmePath);
  const block = /<!-- BEGIN FOUNDATION IDENTITY -->[\s\S]*?<!-- END FOUNDATION IDENTITY -->/;
  await writeAtomic(readmePath, block.test(readme) ? readme.replace(block, () => summary) : readme.trimEnd() + '\n\n' + summary + '\n');
}
export function installationInfra(c, d) {
  const compose = composeSnippet(c, d);
  const phpStart = compose.indexOf(`    ${c.PHP_SERVICE}:\n`);
  const volumesStart = compose.indexOf('\nvolumes:\n');
  const node = compose.slice(compose.indexOf('services:\n'), phpStart).trimEnd();
  const volumes = compose.slice(volumesStart + 1).trimEnd();
  return [
    '<!-- BEGIN FOUNDATION INSTALL INFRA -->',
    '## 3. Preparar serviços Node, mount, volumes e sites',
    'O executor usa docker run --rm (etapas 2 e 5); não cadastrar serviço de bootstrap no Compose.',
    'Antes de executar o bootstrap, aplique **todos os quatro itens** abaixo para o ambiente **' + c.APP_ENV + '** e o projeto **' + c.PROJECT_SLUG + '**. Não duplique entradas que já estejam corretas. Os trechos abaixo refletem a configuração central e o mapeamento deste ambiente; confira-os antes de aplicar. O restante do guia usa exemplos, que devem ser adaptados ao projeto.',
    '### 3.1 Serviços Node no Compose existente',
    'Arquivo de destino: `' + d.mapping.toHost(d.internalFiles[0]) + '`. Acrescentar o serviço ao `services` existente, sem duplicar essa chave. Inicie o Vite somente após executar o bootstrap e instalar as dependências, conforme a etapa 7.',
    '```yaml\n' + node + '\n```',
    '### 3.2 Mount vendor no PHP-FPM existente',
    'No mesmo Compose, localizar `services.' + c.PHP_SERVICE + '.volumes` e acrescentar somente a linha abaixo. Preservar os mounts atuais; não criar outro serviço PHP nem substituir sua lista de volumes.',
    '```yaml\n- ' + c.vendorVolume + ':' + c.backend + '/vendor\n```',
    '### 3.3 Declaração dos volumes ao final do Compose',
    'No mesmo arquivo, mesclar estas declarações no bloco `volumes` de nível raiz, no mesmo nível de `services` e `networks`. Se o bloco ainda não existir, criá-lo. O mount do passo anterior e esta declaração são necessários.',
    '```yaml\n' + volumes + '\n```',
    '### 3.4 Sites Nginx',
    'No arquivo de sites ativo do Nginx, acrescentar o bloco abaixo preservando os outros sites. Nesta infraestrutura local, o destino é `C:\\var\\www\\infra\\nginx\\sites_local.conf`. Em produção, usar o arquivo realmente montado e conferir os certificados. A PWA usa `frontend/dist` e o admin usa `admin/dist`; ambos encaminham rotas técnicas ao mesmo Laravel. O admin não possui PWA. Substitua o bloco anterior deste projeto, sem duplicar o server_name.',
    '```nginx\n' + (nginxSnippet(c) + '\n' + nginxSnippet(c, true)).trimEnd() + '\n```',
    '<!-- END FOUNDATION INSTALL INFRA -->',
  ].join('\n\n');
}
export function normalizeNginx(value) { return value.replace(/#[^\n]*/g, '').replace(/\s+/g, ''); }
export function siteApplied(output, c) { return [false, true].every(admin => normalizeNginx(output).includes(normalizeNginx(nginxSnippet(c, admin)))); }
