<template>
  <f7-page name="client-account" @page:afterin="enter" @page:beforeout="leave" @page:beforeremove="leave">
    <f7-navbar title="Minha conta" back-link="Voltar" />
    <div class="app-content">
      <f7-block>
        <h1 class="app-heading">Minha conta</h1>
        <template v-if="clientState.status === 'authenticated' && clientState.user"><p>Olá, {{ clientState.user.name }}.</p><p>{{ clientState.user.email }}</p><p class="app-note">Você está na área protegida do cliente.</p></template>
        <p v-else role="status">{{ clientState.status === 'checking' ? 'Conferindo sessão…' : 'Sessão não verificada. Confira a conexão antes de continuar.' }}</p>
        <p v-if="message" role="alert">{{ message }}</p>
        <div class="app-actions"><f7-button type="button" fill :disabled="busy" :aria-disabled="busy" :tabindex="busy ? -1 : 0" @click="logout">Sair da conta</f7-button><f7-button outline href="/">Abrir Hello</f7-button><f7-button v-if="clientState.status === 'unavailable'" type="button" outline @click="verify">Tentar novamente</f7-button></div>
      </f7-block>
    </div>
  </f7-page>
</template>
<script setup>
import { ref, onBeforeUnmount } from 'vue';
import { f7 } from 'framework7-vue';
import { clientAuth, clientState } from '../services/session.js';
import { authMessage } from '../services/client-auth.js';
const busy = ref(false), message = ref('');
let active = false;
async function verify() {
  if (!active || busy.value || document.visibilityState === 'hidden') return;
  try { const user = await clientAuth.check(); if (active && !user) f7.views.main.router.navigate('/entrar/', { reloadCurrent: true }); }
  catch (error) { if (active) message.value = authMessage(error); }
}
function offline() { clientAuth.invalidate('unavailable'); }
function enter() { if (active) return; active = true; window.addEventListener('focus', verify); window.addEventListener('online', verify); window.addEventListener('offline', offline); document.addEventListener('visibilitychange', verify); verify(); }
function leave() { active = false; window.removeEventListener('focus', verify); window.removeEventListener('online', verify); window.removeEventListener('offline', offline); document.removeEventListener('visibilitychange', verify); }
async function logout() {
  if (busy.value) return; busy.value = true; message.value = '';
  try { await clientAuth.logout(); if (active) f7.views.main.router.navigate('/entrar/', { reloadCurrent: true }); }
  catch (error) { message.value = authMessage(error); }
  finally { busy.value = false; }
}
onBeforeUnmount(leave);
</script>
