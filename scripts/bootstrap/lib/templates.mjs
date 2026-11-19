import path from 'node:path';
import { websiteBuildId } from './website.mjs';
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
            - type: bind
              source: ${yamlPath(d.mapping.toHost(c.shared))}
              target: /shared
              read_only: true
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
${service(c.nodeService, c.frontend, c.modulesVolume, c.DEV_PORT)}${service(c.adminNodeService, c.admin, c.adminModulesVolume, c.ADMIN_DEV_PORT)}${websiteServiceSnippet(c, d)}    ${c.PHP_SERVICE}:
        volumes:
            # Acrescentar aos mounts existentes:
            - ${c.vendorVolume}:${c.backend}/vendor
volumes:
${[c.vendorVolume, c.modulesVolume, c.adminModulesVolume, c.websiteModulesVolume].map(name => `    ${name}:
        name: ${name}
`).join('')}`;
}
export function websiteServiceSnippet(c, d) {
  return `    ${c.websiteService}:
        image: node:22-bookworm-slim
        working_dir: /app
        command: ["node", "scripts/start.mjs"]
        restart: unless-stopped
        environment:
            NODE_ENV: production
            NITRO_HOST: 0.0.0.0
            NITRO_PORT: 3000
        volumes:
            - type: bind
              source: ${yamlPath(d.mapping.toHost(c.website))}
              target: /app
            - type: bind
              source: ${yamlPath(d.mapping.toHost(c.shared))}
              target: /shared
              read_only: true
            - ${c.websiteModulesVolume}:/app/node_modules
        expose:
            - "3000"
        networks:
            - ${c.DOCKER_NETWORK}
        profiles:
            - website
`;
}
export function websiteNginxSnippet(c) {
  const host = new URL(c.websiteUrl).hostname;
  const common = `    server_name ${host};
    charset utf-8;
    resolver 127.0.0.11 valid=10s ipv6=off;
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
    location / {
        set $website_upstream ${c.websiteService}:3000;
        proxy_pass http://$website_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
`;
  if (c.APP_ENV === 'local') return `# WEBSITE FOUNDATION: ${c.PROJECT_SLUG}\nserver {\n    listen 80;\n${common}}\n`;
  return `# WEBSITE FOUNDATION: ${c.PROJECT_SLUG}\nserver {\n    listen 80;\n    server_name ${host};\n    location /.well-known/acme-challenge/ { root /var/www/certbot; }\n    location / { return 301 https://$host$request_uri; }\n}\nserver {\n    listen 443 ssl;\n    ssl_certificate /etc/letsencrypt/live/${host}/fullchain.pem;\n    ssl_certificate_key /etc/letsencrypt/live/${host}/privkey.pem;\n${common}}\n`;
}
export function websitePublicConfiguration(c) {
  return { name: c.PROJECT_NAME, slug: c.PROJECT_SLUG, locale: c.APP_LOCALE.replace('_', '-'), websiteUrl: c.websiteUrl, pwaUrl: c.appUrl, buildId: c.websiteBuildId };
}
export function nuxtCmd(c, d) {
  const cmdPath = value => {
    const relative = path.relative(c.website, value).split(path.sep).join('\\');
    requireThat(!/["\r\n]/.test(relative), 'Caminho inválido para atalho CMD.');
    return '%~dp0' + relative.replaceAll('%', '%%');
  };
  const flags = `-p ${d.project} --project-directory "${cmdPath(d.directory)}" ${d.internalFiles.map(file => `-f "${cmdPath(file)}"`).join(' ')} --profile website`;
  return `@echo off\r\nsetlocal DisableDelayedExpansion\r\nif /I "%~1"=="dev" goto dev\r\nif /I "%~1"=="build" goto build\r\necho Use: nuxt dev ou nuxt build\r\nexit /b 1\r\n:dev\r\ndocker compose ${flags} run --rm --no-deps -e NODE_ENV=development -p 127.0.0.1:${c.WEBSITE_DEV_PORT}:3000 ${c.websiteService} npm run dev\r\nexit /b %errorlevel%\r\n:build\r\ndocker compose ${flags} run --rm --no-deps ${c.websiteService} npm run build\r\nexit /b %errorlevel%\r\n`;
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
  c.websiteBuildId = await websiteBuildId(c);
  await writeAtomic(path.join(c.website, '.foundation.server.json'), JSON.stringify({ backendTarget: c.NGINX_INTERNAL_URL, backendHost: new URL(c.websiteUrl).host, websiteUrl: c.websiteUrl, devPort: c.WEBSITE_DEV_PORT, clientSessionCookie: c.clientSessionCookie }, null, 2) + '\n');
  await writeAtomic(path.join(c.website, '.foundation.public.json'), JSON.stringify(websitePublicConfiguration(c), null, 2) + '\n');
  await writeAtomic(path.join(c.website, 'nuxt.cmd'), nuxtCmd(c, d));
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
  const summary = `<!-- BEGIN FOUNDATION IDENTITY -->\n| Campo | Valor |\n| --- | --- |\n| Projeto | ${c.PROJECT_NAME.replaceAll('|', '\\|')} |\n| Slug | ${c.PROJECT_SLUG} |\n| Ambiente | ${c.APP_ENV} |\n| URL | ${c.appUrl} |\n| Dev / preview | ${c.DEV_PORT} / ${c.PREVIEW_PORT} |\n| Serviço / Compose | ${c.nodeService} / ${d.project} |\n| Volumes | ${c.vendorVolume}, ${c.modulesVolume} |\n| Bancos | ${c.DB_DATABASE}, ${c.DB_TEST_DATABASE} |\n| Admin | ${c.adminUrl} |\n| Admin dev / preview | ${c.ADMIN_DEV_PORT} / ${c.ADMIN_PREVIEW_PORT} |\n| Website | ${c.websiteUrl} |\n| Website dev | ${c.WEBSITE_DEV_PORT} |\n| Fundação | 1.1.0-website.4 |\n<!-- END FOUNDATION IDENTITY -->`;
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
    '## 2. Preparar serviços Node, mount, volumes e sites',
    '### 2.1 Serviços Node no Compose existente',
    'Arquivo de destino: `' + d.mapping.toHost(d.internalFiles[0]) + '`.',
    '```yaml\n' + node + '\n```',
    '### 2.2 Mount vendor no PHP-FPM existente',
    'No mesmo Compose, localizar `services.' + c.PHP_SERVICE + '.volumes` e acrescentar somente a linha abaixo. Preservar os mounts atuais; não criar outro serviço PHP nem substituir sua lista de volumes.',
    '```yaml\n- ' + c.vendorVolume + ':' + c.backend + '/vendor\n```',
    '### 2.3 Declaração dos volumes ao final do Compose',
    'No mesmo arquivo, mesclar estas declarações no bloco `volumes` de nível raiz, no mesmo nível de `services` e `networks`.',
    '```yaml\n' + volumes + '\n```',
    '### 2.4 Sites Nginx',
    'No arquivo de sites ativo do Nginx, acrescentar o bloco abaixo preservando os outros sites. Nesta infraestrutura local, o destino é `C:\\var\\www\\infra\\nginx\\sites_local.conf`. Em produção, usar o arquivo realmente montado e conferir os certificados. PWA: `pwa/dist`; admin: `admin/dist`; website: proxy para Nuxt. Rotas técnicas seguem para Laravel. Substitua o bloco anterior deste projeto, sem duplicar o server_name.',
    '```nginx\n' + (nginxSnippet(c) + '\n' + nginxSnippet(c, true) + '\n' + websiteNginxSnippet(c)).trimEnd() + '\n```',
    '<!-- END FOUNDATION INSTALL INFRA -->',
  ].join('\n\n');
}
export function normalizeNginx(value) { return value.replace(/#[^\n]*/g, '').replace(/\s+/g, ''); }
export function siteApplied(output, c) { return [nginxSnippet(c), nginxSnippet(c, true), websiteNginxSnippet(c)].every(site => normalizeNginx(output).includes(normalizeNginx(site))); }
