<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { initAuthForm } from '~/forms/auth';
import { authMessage } from '~/services/client-auth';
const props = defineProps({ registration: Boolean });
const { auth } = useClientSession();
const form = ref(null), ready = ref(false), busy = ref(false), message = ref('');
const values = reactive({ name: '', email: '', password: '', password_confirmation: '' });
let active = true, destroy;
async function submit() {
  if (!ready.value || busy.value || !active) return;
  busy.value = true; message.value = '';
  try { await auth[props.registration ? 'register' : 'login'](values); values.password = ''; values.password_confirmation = ''; if (active) await navigateTo('/conta/', { replace: true }); }
  catch (error) { if (active) message.value = authMessage(error) + ' ' + Object.values(error.errors || {}).flat().join(' '); }
  finally { busy.value = false; }
}
onMounted(async () => {
  try { destroy = await initAuthForm(form.value, props.registration, submit, () => active); if (!active) { destroy?.(); return; } ready.value = Boolean(destroy); }
  catch { if (active) message.value = 'Não foi possível preparar o formulário. Recarregue a página.'; }
});
onBeforeUnmount(() => { active = false; destroy?.(); values.password = ''; values.password_confirmation = ''; });
</script>
<template>
  <section class="mx-auto max-w-lg rounded-xl border bg-card p-6 shadow-sm sm:p-10">
    <h1 class="text-2xl font-semibold">{{ registration ? 'Criar conta' : 'Entrar' }}</h1>
    <form ref="form" novalidate :aria-label="registration ? 'Cadastro de cliente' : 'Login de cliente'" :aria-busy="busy" class="mt-6 space-y-5" @submit.prevent>
      <fieldset :disabled="!ready || busy" class="space-y-5"><legend class="sr-only">Dados da conta</legend>
        <div v-if="registration" class="space-y-2"><Label for="website-auth-name">Nome</Label><Input id="website-auth-name" v-model="values.name" name="name" autocomplete="name" required /><div id="website-auth-name-errors" data-errors="name" aria-live="polite"></div></div>
        <div class="space-y-2"><Label for="website-auth-email">E-mail</Label><Input id="website-auth-email" v-model="values.email" name="email" type="email" autocomplete="username" required /><div id="website-auth-email-errors" data-errors="email" aria-live="polite"></div></div>
        <div class="space-y-2"><Label for="website-auth-password">Senha</Label><Input id="website-auth-password" v-model="values.password" name="password" type="password" :autocomplete="registration ? 'new-password' : 'current-password'" required /><div id="website-auth-password-errors" data-errors="password" aria-live="polite"></div></div>
        <div v-if="registration" class="space-y-2"><Label for="website-auth-confirmation">Confirmar senha</Label><Input id="website-auth-confirmation" v-model="values.password_confirmation" name="password_confirmation" type="password" autocomplete="new-password" required /><div id="website-auth-confirmation-errors" data-errors="password_confirmation" aria-live="polite"></div></div>
        <Button type="submit" class="w-full">{{ busy ? 'Aguarde…' : registration ? 'Criar conta' : 'Entrar' }}</Button>
      </fieldset>
      <p role="status" aria-live="polite" class="text-sm text-muted-foreground">{{ message || (!ready ? 'Preparando formulário…' : '') }}</p>
      <noscript>Ative o JavaScript para acessar sua conta.</noscript>
    </form>
    <div class="mt-5 flex flex-wrap gap-4 text-sm underline"><NuxtLink :to="registration ? '/entrar/' : '/cadastro/'">{{ registration ? 'Já tenho conta' : 'Criar conta' }}</NuxtLink><NuxtLink to="/esqueci-senha/">Esqueci minha senha</NuxtLink></div>
  </section>
</template>
