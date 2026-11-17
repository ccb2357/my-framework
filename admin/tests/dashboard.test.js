import { it, expect } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import HelloDashboard from '../src/pages/HelloDashboard.vue';
it('renders the installation page with real shadcn controls and a pending status', async () => {
  const html = await renderToString(createSSRApp(HelloDashboard, { administrator: { id: 1, name: 'Admin', email: 'admin@example.test' } }));
  expect(html).toContain('Hello Dashboard');
  expect(html).toContain('data-slot="card"');
  expect(html).toContain('data-slot="button"');
  expect(html).toContain('Verificando');
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain('disabled');
  expect(html).not.toContain('Backend OK');
  expect(html).not.toContain('manifest.webmanifest');
});
