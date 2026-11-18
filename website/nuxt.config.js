import { fileURLToPath } from 'node:url';
import { defineNuxtConfig } from 'nuxt/config';
import tailwindcss from '@tailwindcss/vite';
import { readConfiguration } from './scripts/config.mjs';
import { readServerConfiguration } from './scripts/server-config.mjs';
const publicConfig = readConfiguration();
const serverConfig = readServerConfiguration();
const root = fileURLToPath(new URL('.', import.meta.url));
const shared = fileURLToPath(new URL('../shared', import.meta.url));

export default defineNuxtConfig({
  compatibilityDate: '2026-11-18',
  ssr: true,
  alias: { '@shared': shared },
  components: [{ path: '~/components', extensions: ['.vue'] }],
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: { clientBackend: serverConfig, public: publicConfig },
  app: { head: { htmlAttrs: { lang: publicConfig.locale }, title: publicConfig.name } },
  nitro: { preset: 'node-server', output: { dir: process.env.FOUNDATION_WEBSITE_OUTPUT || '.output' } },
  watchers: { chokidar: { usePolling: true, interval: 300 } },
  vite: {
    plugins: [tailwindcss()],
    server: {
      fs: { allow: [root, shared] },
      watch: { usePolling: true, interval: 300, ignored: ['**/.releases/**', '**/.nuxt/**', '**/.output/**'] },
    },
  },
  routeRules: { '/**': { headers: { 'cache-control': 'no-store' } } },
  telemetry: false,
});
