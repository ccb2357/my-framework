<script setup>
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import JustValidate from 'just-validate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { recoveryForm, readRecoveryLink, createRecovery } from '@shared/forms/recovery.js';
import { adminRequest } from '@/services/auth';
const props = defineProps({ reset: Boolean });
const state = reactive({}), form = ref(null);
const link = props.reset ? readRecoveryLink(window.location, window.history) : {};
const controller = createRecovery((path, json) => adminRequest(path, { method: 'POST', json }), state, props.reset, link);
let destroy;
onMounted(() => { destroy = recoveryForm(JustValidate, form.value, props.reset, controller.submit); });
onBeforeUnmount(() => { destroy?.(); controller.destroy(); });
</script>
<template>
 <main class="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground"><Card class="w-full max-w-md"><CardHeader><CardTitle>{{ reset ? 'Redefinir senha' : 'Recuperar senha' }}</CardTitle><CardDescription>Conta administrativa</CardDescription></CardHeader><CardContent>
  <form ref="form" novalidate aria-label="Recuperação administrativa" :aria-busy="state.busy" class="space-y-5">
   <div class="space-y-2"><Label for="admin-recovery-email">E-mail</Label><Input id="admin-recovery-email" v-model="state.email" name="email" type="email" autocomplete="username" required :disabled="state.busy || state.done" /><div id="admin-recovery-email-errors" data-errors="email" aria-live="polite" class="text-sm text-destructive"></div></div>
   <template v-if="reset"><div class="space-y-2"><Label for="admin-recovery-password">Nova senha</Label><Input id="admin-recovery-password" v-model="state.password" name="password" type="password" autocomplete="new-password" required :disabled="state.busy || state.done" /><div id="admin-recovery-password-errors" data-errors="password" aria-live="polite" class="text-sm text-destructive"></div></div>
   <div class="space-y-2"><Label for="admin-recovery-confirmation">Confirmar senha</Label><Input id="admin-recovery-confirmation" v-model="state.password_confirmation" name="password_confirmation" type="password" autocomplete="new-password" required :disabled="state.busy || state.done" /><div id="admin-recovery-confirmation-errors" data-errors="password_confirmation" aria-live="polite" class="text-sm text-destructive"></div></div></template>
   <p v-if="state.message" role="status" aria-live="polite" class="text-sm">{{ state.message }}</p><Button type="submit" class="w-full" :disabled="state.busy || state.done">{{ state.busy ? 'Aguarde…' : reset ? 'Salvar nova senha' : 'Enviar instruções' }}</Button>
   <p class="text-sm"><a href="/" class="underline">Voltar ao login</a></p><p v-if="reset" class="text-sm"><a href="/esqueci-senha/" class="underline">Solicitar outro link</a></p>
  </form>
 </CardContent></Card></main>
</template>
