import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)), '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: { __FOUNDATION_ADMIN__: JSON.stringify({ name: 'Projeto · Admin', slug: 'sample', locale: 'pt-BR', appUrl: 'http://admin.sample.localhost', apiBase: '/api/v1' }) },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
});
