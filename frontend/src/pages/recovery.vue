<template>
 <f7-page :name="reset ? 'reset-password' : 'forgot-password'" @page:afterin="enter" @page:beforeout="leave" @page:beforeremove="leave">
  <f7-navbar :title="reset ? 'Redefinir senha' : 'Recuperar senha'" back-link="Voltar" />
  <div class="app-content"><f7-block><h1 class="app-heading">{{ reset ? 'Crie uma nova senha' : 'Esqueceu sua senha?' }}</h1><p class="app-note">{{ reset ? 'Informe uma nova senha e confirme.' : 'Informe o e-mail da sua conta de cliente.' }}</p></f7-block>
   <form ref="form" novalidate aria-label="Recuperação de senha" :aria-busy="state.busy">
    <f7-list strong inset>
     <f7-list-input :input-id="prefix + '-email'" name="email" type="email" autocomplete="username" required :disabled="state.busy || state.done" v-model:value="state.email"><template #label><label :for="prefix + '-email'">E-mail</label></template><template #info><div :id="prefix + '-email-errors'" data-errors="email" aria-live="polite"></div></template></f7-list-input>
     <template v-if="reset"><f7-list-input :input-id="prefix + '-password'" name="password" type="password" autocomplete="new-password" required :disabled="state.busy || state.done" v-model:value="state.password"><template #label><label :for="prefix + '-password'">Nova senha</label></template><template #info><div :id="prefix + '-password-errors'" data-errors="password" aria-live="polite"></div></template></f7-list-input>
     <f7-list-input :input-id="prefix + '-confirmation'" name="password_confirmation" type="password" autocomplete="new-password" required :disabled="state.busy || state.done" v-model:value="state.password_confirmation"><template #label><label :for="prefix + '-confirmation'">Confirmar senha</label></template><template #info><div :id="prefix + '-confirmation-errors'" data-errors="password_confirmation" aria-live="polite"></div></template></f7-list-input></template>
    </f7-list>
    <f7-block><p v-if="state.message" role="status" aria-live="polite">{{ state.message }}</p><div class="app-actions"><f7-button type="submit" fill :disabled="state.busy || state.done" :aria-disabled="state.busy || state.done">{{ state.busy ? 'Aguarde…' : reset ? 'Salvar nova senha' : 'Enviar instruções' }}</f7-button><f7-button outline href="/entrar/">Voltar ao login</f7-button><f7-button v-if="reset" outline href="/esqueci-senha/">Solicitar outro link</f7-button></div></f7-block>
   </form>
  </div>
 </f7-page>
</template>
<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import JustValidate from 'just-validate';
import { recoveryForm, readRecoveryLink, createRecovery } from '@shared/forms/recovery.js';
import { apiRequest } from '../services/api.js';
import { pwa } from '../pwa/index.js';
const props = defineProps({ reset: Boolean });
const prefix = props.reset ? 'reset' : 'recovery';
const state = reactive({}), form = ref(null);
const link = props.reset ? readRecoveryLink(window.location, window.history) : {};
const controller = createRecovery((path, json) => apiRequest('/api/v1/auth/' + path, { method: 'POST', json, csrfRefresh: true }), state, props.reset, link);
let destroy, release;
function enter() { if (destroy) return; controller.resume(); destroy = recoveryForm(JustValidate, form.value, props.reset, controller.submit); release = pwa.draftGuard(() => state.busy || controller.dirty(), () => { throw new Error('Conclua ou saia da recuperação antes de atualizar.'); }); }
function leave() { destroy?.(); destroy = undefined; release?.(); release = undefined; controller.destroy(); }
onMounted(enter); onBeforeUnmount(leave);
</script>
