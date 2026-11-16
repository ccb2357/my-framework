<template>
  <f7-page :name="registration ? 'register' : 'login'" @page:afterin="enter" @page:beforeout="leave" @page:beforeremove="leave">
    <f7-navbar :title="registration ? 'Criar conta' : 'Entrar'" back-link="Voltar" />
    <div class="app-content">
      <f7-block><h1 class="app-heading">{{ registration ? 'Crie sua conta' : 'Acesse sua conta' }}</h1><p v-if="registration" class="app-note">Cadastre-se para acessar. Não é necessário confirmar o e-mail.</p></f7-block>
      <form ref="form" novalidate :aria-label="registration ? 'Criar conta' : 'Entrar'" :aria-busy="busy" @input="clearFeedback">
        <f7-list strong inset>
          <f7-list-input v-if="registration" :input-id="prefix + '-name'" name="name" type="text" autocomplete="name" required :disabled="busy" v-model:value="values.name"><template #label><label :for="prefix + '-name'">Nome</label></template><template #info><div :id="prefix + '-name-errors'" data-errors="name" aria-live="polite"></div></template></f7-list-input>
          <f7-list-input :input-id="prefix + '-email'" name="email" type="email" autocomplete="username" required :disabled="busy" v-model:value="values.email"><template #label><label :for="prefix + '-email'">E-mail</label></template><template #info><div :id="prefix + '-email-errors'" data-errors="email" aria-live="polite"></div></template></f7-list-input>
          <f7-list-input :input-id="prefix + '-password'" name="password" type="password" :autocomplete="registration ? 'new-password' : 'current-password'" required :disabled="busy" v-model:value="values.password"><template #label><label :for="prefix + '-password'">Senha</label></template><template #info><div :id="prefix + '-password-errors'" data-errors="password" aria-live="polite"></div></template></f7-list-input>
          <f7-list-input v-if="registration" :input-id="prefix + '-confirmation'" name="password_confirmation" type="password" autocomplete="new-password" required :disabled="busy" v-model:value="values.password_confirmation"><template #label><label :for="prefix + '-confirmation'">Confirmar senha</label></template><template #info><div :id="prefix + '-confirmation-errors'" data-errors="password_confirmation" aria-live="polite"></div></template></f7-list-input>
        </f7-list>
        <f7-block v-if="registration" class="app-note">Use pelo menos {{ authPolicy.passwordMin }} caracteres.</f7-block>
        <f7-block>
          <div v-if="message" role="alert"><p>{{ message }}</p><ul v-if="serverErrors.length"><li v-for="error in serverErrors" :key="error">{{ error }}</li></ul></div>
          <div class="app-actions"><f7-button type="submit" fill preloader :loading="busy" :disabled="busy" :aria-disabled="busy" :tabindex="busy ? -1 : 0">{{ registration ? 'Criar conta' : 'Entrar' }}</f7-button><f7-button outline href="/" :disabled="busy" :aria-disabled="busy">Voltar à Hello</f7-button></div>
          <p class="app-note"><f7-link :href="registration ? '/entrar/' : '/cadastro/'">{{ registration ? 'Já tenho uma conta' : 'Quero criar uma conta' }}</f7-link></p>
        </f7-block>
      </form>
    </div>
  </f7-page>
</template>
<script setup>
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { f7 } from 'framework7-vue';
import { initAuthForm } from '../forms/auth.js';
import { clientAuth } from '../services/session.js';
import { authMessage } from '../services/client-auth.js';
import { authPolicy } from '@shared/forms/rules.js';
import { pwa } from '../pwa/index.js';
const props = defineProps({ registration: { type: Boolean, default: false } });
const registration = computed(() => props.registration);
const prefix = computed(() => registration.value ? 'register' : 'login');
const values = reactive({ name: '', email: '', password: '', password_confirmation: '' });
const form = ref(null), busy = ref(false), message = ref(''), errors = ref({});
const serverErrors = computed(() => Object.values(errors.value).flat());
let destroyForm, releaseGuard, active = false;
function clearFeedback() { message.value = ''; errors.value = {}; }
function enter() {
  if (active) return; active = true;
  destroyForm = initAuthForm(form.value, registration.value, submit);
  releaseGuard = pwa.draftGuard(() => busy.value || Object.values(values).some(Boolean), () => { throw new Error('Conclua ou limpe o formulário de acesso antes de atualizar.'); });
}
function leave() {
  active = false; destroyForm?.(); destroyForm = undefined; releaseGuard?.(); releaseGuard = undefined;
  for (const key of Object.keys(values)) values[key] = '';
  clearFeedback();
}
async function submit() {
  if (busy.value || !active) return; busy.value = true; clearFeedback();
  try {
    await clientAuth[registration.value ? 'register' : 'login']({ ...values });
    values.password = ''; values.password_confirmation = '';
    if (active) f7.views.main.router.navigate('/conta/', { reloadCurrent: true });
  } catch (error) { if (active) { message.value = authMessage(error); errors.value = error.errors || {}; } }
  finally { busy.value = false; }
}
onMounted(enter);
onBeforeUnmount(leave);
</script>
