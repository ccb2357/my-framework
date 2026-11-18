<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import { recoveryForm, readRecoveryLink, createRecovery } from '@shared/forms/recovery.js';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { apiRequest } from '~/services/api';
const props = defineProps({ reset: Boolean });
const state = reactive({ email: '', password: '', password_confirmation: '', busy: false, done: false, message: '' });
const ready = ref(false), form = ref(null);
let active = true, controller, destroy;
onMounted(async () => {
  // Fragments are consumed only in the browser and removed before loading the validator.
  const link = props.reset ? readRecoveryLink(window.location, window.history) : {};
  controller = createRecovery((path, json) => apiRequest('/api/v1/auth/' + path, { method: 'POST', json, csrfRefresh: true }), state, props.reset, link);
  try {
    const { default: JustValidate } = await import('just-validate');
    if (!active) return;
    destroy = recoveryForm(JustValidate, form.value, props.reset, controller.submit); ready.value = true;
  } catch { if (active) state.message = 'Não foi possível preparar o formulário. Recarregue a página.'; }
});
onBeforeUnmount(() => { active = false; destroy?.(); controller?.destroy(); });
</script>
<template>
  <section class="mx-auto max-w-lg rounded-xl border bg-card p-6 shadow-sm sm:p-10">
    <h1 class="text-2xl font-semibold">{{ reset ? 'Redefinir senha' : 'Esqueceu sua senha?' }}</h1>
    <p class="mt-3 text-sm text-muted-foreground">{{ reset ? 'Informe uma nova senha e confirme.' : 'Informe o e-mail da sua conta de cliente.' }}</p>
    <form ref="form" novalidate aria-label="Recuperação de senha do cliente" :aria-busy="state.busy" class="mt-6 space-y-5" @submit.prevent>
      <fieldset :disabled="!ready || state.busy || state.done" class="space-y-5"><legend class="sr-only">Recuperação de senha</legend>
        <div class="space-y-2"><Label for="website-recovery-email">E-mail</Label><Input id="website-recovery-email" v-model="state.email" name="email" type="email" autocomplete="username" required /><div id="website-recovery-email-errors" data-errors="email" aria-live="polite"></div></div>
        <template v-if="reset"><div class="space-y-2"><Label for="website-recovery-password">Nova senha</Label><Input id="website-recovery-password" v-model="state.password" name="password" type="password" autocomplete="new-password" required /><div id="website-recovery-password-errors" data-errors="password" aria-live="polite"></div></div>
        <div class="space-y-2"><Label for="website-recovery-confirmation">Confirmar senha</Label><Input id="website-recovery-confirmation" v-model="state.password_confirmation" name="password_confirmation" type="password" autocomplete="new-password" required /><div id="website-recovery-confirmation-errors" data-errors="password_confirmation" aria-live="polite"></div></div></template>
        <Button type="submit" class="w-full">{{ state.busy ? 'Aguarde…' : reset ? 'Salvar nova senha' : 'Enviar instruções' }}</Button>
      </fieldset>
      <p role="status" aria-live="polite" class="text-sm text-muted-foreground">{{ state.message || (!ready ? 'Preparando formulário…' : '') }}</p>
      <noscript>Ative o JavaScript para recuperar sua senha.</noscript>
    </form>
    <div class="mt-5 flex flex-wrap gap-4 text-sm underline"><NuxtLink to="/entrar/">Voltar ao login</NuxtLink><NuxtLink v-if="reset" to="/esqueci-senha/">Solicitar outro link</NuxtLink></div>
  </section>
</template>
