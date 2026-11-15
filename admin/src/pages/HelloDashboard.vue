<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { app } from '@/lib/config';
import { fetchStatus } from '@/services/status';
const state = ref('loading');
let request;
async function refresh() {
  request?.abort();
  request = new AbortController();
  const current = request;
  state.value = 'loading';
  try {
    await fetchStatus(current.signal);
    if (request === current) state.value = 'ok';
  } catch {
    if (request === current && !current.signal.aborted) state.value = 'error';
  }
}
function offline() { request?.abort(); state.value = 'error'; }
onMounted(() => {
  refresh();
  window.addEventListener('online', refresh);
  window.addEventListener('offline', offline);
});
onBeforeUnmount(() => {
  request?.abort();
  window.removeEventListener('online', refresh);
  window.removeEventListener('offline', offline);
});
</script>
<template>
  <div class="min-h-screen bg-background text-foreground">
    <header class="border-b bg-card">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
        <span class="font-semibold tracking-tight">{{ app.name }}</span>
        <Badge variant="secondary">Administrativo</Badge>
      </div>
    </header>
    <main class="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div class="space-y-2">
        <p class="text-sm font-medium text-muted-foreground">Painel administrativo</p>
        <h1 class="text-3xl font-semibold tracking-tight">Hello Dashboard</h1>
        <p class="max-w-2xl text-muted-foreground">Sua estrutura administrativa está preparada para receber as funcionalidades do projeto.</p>
      </div>
      <div class="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conexão com o backend</CardTitle>
            <CardDescription>Diagnóstico do Laravel e do banco compartilhado.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-5">
            <div role="status" aria-live="polite" :aria-busy="state === 'loading'" class="flex flex-wrap items-center gap-2">
              <Badge :variant="state === 'error' ? 'destructive' : 'secondary'">{{ state === 'loading' ? 'Verificando…' : state === 'ok' ? 'Backend OK · Banco OK' : 'Não foi possível verificar os serviços' }}</Badge>
            </div>
            <Button type="button" variant="outline" :disabled="state === 'loading'" @click="refresh">Verificar novamente</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Base administrativa</CardTitle>
            <CardDescription>Vue e shadcn-vue com Tailwind, em uma aplicação independente da PWA.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3 text-sm text-muted-foreground">
            <p>Esta página confirma a instalação. O login administrativo será entregue na etapa de autenticação.</p>
            <p>As funcionalidades do produto serão construídas a partir desta estrutura.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
</template>
