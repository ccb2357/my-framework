<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { app } from '@/lib/config';
import { adminAuth } from '@/services/session';
import { adminMessage } from '@/services/auth';
import { initAdminLogin } from '@/forms/login';
const form = ref(null), email = ref(''), password = ref(''), busy = ref(false), message = ref(''), errors = ref([]);
let dispose, active = true;
async function submit() {
  if (busy.value) return; busy.value = true; message.value = ''; errors.value = [];
  try { await adminAuth.login({ email: email.value, password: password.value }); password.value = ''; }
  catch (error) { if (active) { message.value = adminMessage(error); errors.value = Object.values(error.errors || {}).flat(); } }
  finally { busy.value = false; }
}
onMounted(() => { dispose = initAdminLogin(form.value, submit); });
onBeforeUnmount(() => { active = false; dispose?.(); password.value = ''; });
</script>
<template>
  <main class="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
    <Card class="w-full max-w-md">
      <CardHeader><CardTitle>{{ app.name }}</CardTitle><CardDescription>Entre na sua conta administrativa.</CardDescription></CardHeader>
      <CardContent>
        <form ref="form" novalidate aria-label="Login administrativo" :aria-busy="busy" class="space-y-5" @input="message = ''; errors = []">
          <div class="space-y-2"><Label for="admin-login-email">E-mail</Label><Input id="admin-login-email" v-model="email" name="email" type="email" autocomplete="username" required :disabled="busy" /><div id="admin-login-email-errors" data-errors="email" aria-live="polite" class="text-sm text-destructive"></div></div>
          <div class="space-y-2"><Label for="admin-login-password">Senha</Label><Input id="admin-login-password" v-model="password" name="password" type="password" autocomplete="current-password" required :disabled="busy" /><div id="admin-login-password-errors" data-errors="password" aria-live="polite" class="text-sm text-destructive"></div></div>
          <div v-if="message" role="alert" class="text-sm text-destructive"><p>{{ message }}</p><ul><li v-for="error in errors" :key="error">{{ error }}</li></ul></div>
          <Button type="submit" class="w-full" :disabled="busy">{{ busy ? 'Entrando…' : 'Entrar' }}</Button>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
