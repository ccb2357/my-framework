<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { Button } from '~/components/ui/button';
import { publicContentResource } from '~/services/public-content';
const offline = ref(false);
const { data, status, error, refresh, clear } = await useFetch('/_content', {
  key: 'website-public-content', credentials: 'omit', cache: 'no-store', retry: 0, timeout: 7000,
  transform: publicContentResource,
  default: () => null,
  // Reuse only the SSR hydration payload, never a previous navigation's static payload.
  getCachedData: (key, app) => app.isHydrating ? app.payload.data[key] : undefined,
});
const phase = computed(() => offline.value || error.value ? 'error' : status.value === 'pending' || status.value === 'idle' ? 'loading' : data.value?.data ? 'ready' : 'empty');
async function reload() {
  if (offline.value || status.value === 'pending' || document.visibilityState === 'hidden') return;
  clear();
  await refresh();
}
function disconnected() { offline.value = true; clear(); }
function connected() { offline.value = false; reload(); }
onMounted(() => {
  if (navigator.onLine === false) disconnected();
  window.addEventListener('focus', reload); window.addEventListener('online', connected); window.addEventListener('offline', disconnected); document.addEventListener('visibilitychange', reload);
});
onBeforeUnmount(() => { window.removeEventListener('focus', reload); window.removeEventListener('online', connected); window.removeEventListener('offline', disconnected); document.removeEventListener('visibilitychange', reload); });
</script>
<template>
  <section class="mt-8 rounded-xl border bg-card p-6 shadow-sm sm:p-10" aria-labelledby="website-content-title" data-dynamic-content :aria-busy="phase === 'loading'">
    <h2 id="website-content-title" class="text-xl font-semibold">Conteúdo dinâmico</h2>
    <div aria-live="polite" aria-atomic="true" class="mt-4">
      <p v-if="phase === 'loading'" role="status" class="text-sm text-muted-foreground">Carregando conteúdo…</p>
      <p v-else-if="phase === 'error'" role="status" class="text-sm text-muted-foreground">{{ offline ? 'Sem conexão. Reconecte para consultar o conteúdo.' : error?.statusCode === 429 ? 'Aguarde antes de atualizar novamente.' : 'Não foi possível carregar o conteúdo. Tente novamente.' }}</p>
      <p v-else-if="phase === 'empty'" role="status" class="text-sm text-muted-foreground">Nenhum conteúdo publicado.</p>
      <article v-else><h3 class="text-lg font-semibold">{{ data.data.title }}</h3><p class="mt-3 whitespace-pre-line leading-7">{{ data.data.body }}</p></article>
    </div>
    <Button type="button" variant="outline" class="mt-6" :disabled="phase === 'loading' || offline" @click="reload">{{ phase === 'loading' ? 'Carregando…' : 'Atualizar conteúdo' }}</Button>
  </section>
</template>
