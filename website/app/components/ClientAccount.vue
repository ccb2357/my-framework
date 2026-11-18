<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Button } from '~/components/ui/button';
import { authMessage } from '~/services/client-auth';
const { state, auth } = useClientSession();
const busy = ref(false), message = ref('');
let active = true;
async function verify() {
  if (!active || busy.value || document.visibilityState === 'hidden') return;
  try { if (!await auth.check() && active) await navigateTo('/entrar/', { replace: true }); }
  catch { if (active) message.value = 'Não foi possível conferir sua sessão. Confira a conexão e tente novamente.'; }
}
async function logout() {
  if (busy.value) return;
  busy.value = true; message.value = '';
  try { await auth.logout(); if (active) await navigateTo('/entrar/', { replace: true }); }
  catch (error) { if (active) message.value = authMessage(error); }
  finally { busy.value = false; }
}
function offline() { auth.invalidate('unavailable'); }
onMounted(() => { window.addEventListener('focus', verify); window.addEventListener('pageshow', verify); window.addEventListener('online', verify); window.addEventListener('offline', offline); document.addEventListener('visibilitychange', verify); verify(); });
onBeforeUnmount(() => { active = false; window.removeEventListener('focus', verify); window.removeEventListener('pageshow', verify); window.removeEventListener('online', verify); window.removeEventListener('offline', offline); document.removeEventListener('visibilitychange', verify); });
</script>
<template>
  <section class="rounded-xl border bg-card p-6 shadow-sm sm:p-10">
    <h1 class="text-2xl font-semibold">Minha conta</h1>
    <template v-if="state.status === 'authenticated' && state.user"><p class="mt-4">Olá, {{ state.user.name }}.</p><p class="mt-2">{{ state.user.email }}</p><p class="mt-4 text-sm text-muted-foreground">Você está na área protegida do cliente.</p></template>
    <p v-else role="status" class="mt-4">{{ state.status === 'checking' ? 'Conferindo sessão…' : 'Sessão não verificada. Confira a conexão.' }}</p>
    <p v-if="message" role="alert" class="mt-4">{{ message }}</p>
    <div class="mt-6 flex flex-wrap gap-3"><Button type="button" :disabled="busy" @click="logout">{{ busy ? 'Aguarde…' : 'Sair da conta' }}</Button><Button v-if="state.status === 'unavailable'" type="button" variant="outline" :disabled="busy" @click="verify">Tentar novamente</Button><NuxtLink to="/" class="inline-flex items-center underline">Abrir website</NuxtLink></div>
  </section>
</template>
