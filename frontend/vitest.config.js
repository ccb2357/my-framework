import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';
export default defineConfig({ plugins: [vue()], resolve: { alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) } }, test: { environment: 'node', include: ['tests/unit/*.test.mjs'] } });
