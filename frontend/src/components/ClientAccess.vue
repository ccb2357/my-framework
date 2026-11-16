<template>
  <f7-block strong inset>
    <h2 class="status-heading">Sua conta</h2>
    <p v-if="clientState.user">Olá, {{ clientState.user.name }}.</p>
    <p v-else-if="clientState.status === 'checking'" role="status">Conferindo acesso…</p>
    <p v-else-if="clientState.status === 'unavailable'" role="status">Não foi possível conferir sua sessão. Verifique a conexão.</p>
    <div class="app-actions">
      <f7-button v-if="clientState.user" type="button" fill href="/conta/">Abrir minha conta</f7-button>
      <template v-else>
        <f7-button type="button" fill href="/entrar/">Entrar</f7-button>
        <f7-button type="button" outline href="/cadastro/">Criar conta</f7-button>
      </template>
    </div>
  </f7-block>
</template>
<script setup>
import { onMounted } from 'vue';
import { clientAuth, clientState } from '../services/session.js';
onMounted(() => { clientAuth.check().catch(() => {}); });
</script>
