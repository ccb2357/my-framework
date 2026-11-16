// @vitest-environment jsdom
import { test, expect, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import Framework7 from 'framework7/lite-bundle';
import Framework7Vue, { f7Block, f7Button } from 'framework7-vue';
vi.mock('../../src/services/push.js', async importOriginal => ({ ...await importOriginal(), pushApi: vi.fn() }));
import { pushApi } from '../../src/services/push.js';
import PushSettings from '../../src/components/PushSettings.vue';

test('development explains build-only push without probing protected APIs on mount or focus', async () => {
  vi.stubEnv('PROD', false);
  Framework7.use(Framework7Vue);
  const target = document.createElement('div'); document.body.append(target);
  const app = createApp(PushSettings);
  app.component('f7-block', f7Block); app.component('f7-button', f7Button);
  const view = app.mount(target);
  await nextTick();
  expect(target.textContent).toContain('Use a PWA pelo build para ativar push.');
  view.refreshSession();
  window.dispatchEvent(new Event('online'));
  document.dispatchEvent(new Event('visibilitychange'));
  await nextTick();
  expect(pushApi).not.toHaveBeenCalled();
  app.unmount(); target.remove(); vi.unstubAllEnvs();
});
