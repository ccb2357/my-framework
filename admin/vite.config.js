import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwind from '@tailwindcss/vite';
import { buildConfig, buildIdentity } from './scripts/build-config.mjs';
const root = fileURLToPath(new URL('.', import.meta.url));
const config = buildConfig(JSON.parse(fs.readFileSync(new URL('.foundation.public.json', import.meta.url), 'utf8')));
const buildId = buildIdentity(root, config.app);
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const proxy = () => ({ target: config.vite.proxyTarget, changeOrigin: true, headers: { Host: config.vite.proxyHost } });
export default defineConfig({
  root,
  envDir: false,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [vue(), tailwind(), {
    name: 'admin-html',
    transformIndexHtml: html => html.replace('<title>Admin</title>', `<title>${escapeHtml(config.app.name)}</title>`)
      .replace('lang="pt-BR"', `lang="${escapeHtml(config.app.locale)}"`)
      .replace('</head>', `<meta name="admin-build" content="${buildId}"></head>`),
    configureServer(server) { server.middlewares.use(blockPwa); },
    configurePreviewServer(server) { server.middlewares.use(blockPwa); },
  }],
  define: { __FOUNDATION_ADMIN__: JSON.stringify(config.app) },
  server: { host: true, port: 5173, strictPort: true, watch: { usePolling: true, interval: 300 }, proxy: { '/api': proxy(), '/sanctum': proxy(), '/up': proxy(), '/status': proxy() } },
  preview: { host: true, port: 4173, strictPort: true, proxy: { '/api': proxy(), '/sanctum': proxy(), '/up': proxy(), '/status': proxy() } },
  build: { target: 'es2022', emptyOutDir: true, outDir: 'dist' },
});
function blockPwa(req, res, next) {
  if (['/sw.js', '/manifest.webmanifest', '/offline.html'].includes(req.url?.split('?')[0])) { res.statusCode = 404; res.end(); }
  else next();
}
