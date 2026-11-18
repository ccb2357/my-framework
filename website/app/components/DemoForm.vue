<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { initDemoForm } from '~/forms/demo';
const form = ref(null), feedback = ref(''), phoneValue = ref(''), ready = ref(false), failed = ref(false);
let active = true, controller;
onMounted(async () => {
  try {
    controller = await initDemoForm(form.value,
      () => { feedback.value = 'Campos válidos. Nenhum dado foi salvo ou enviado.'; },
      value => { phoneValue.value = value; }, () => active);
    if (!active) { controller?.destroy(); return; }
    ready.value = Boolean(controller);
  } catch {
    if (active) failed.value = true;
  }
});
onBeforeUnmount(() => { active = false; controller?.destroy(); });
</script>

<template>
  <section class="mt-8 rounded-xl border bg-card p-6 shadow-sm sm:p-10" aria-labelledby="website-form-title">
    <h2 id="website-form-title" class="text-xl font-semibold">Experimente o formulário</h2>
    <p class="mt-2 text-sm leading-6 text-muted-foreground">Máscaras e mensagens compartilhadas com a PWA e o admin. Os dados não são enviados nem salvos.</p>
    <form ref="form" novalidate aria-label="Formulário de demonstração do website" class="mt-6 space-y-5" @submit.prevent @input="feedback = ''">
      <fieldset :disabled="!ready" class="space-y-5">
        <legend class="sr-only">Dados de demonstração</legend>
        <div class="grid gap-5 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="website-demo-email">E-mail</Label>
            <Input id="website-demo-email" type="email" required autocomplete="off" placeholder="voce@exemplo.com" />
            <div data-email-errors aria-live="polite"></div>
          </div>
          <div class="space-y-2">
            <Label for="website-demo-phone">Celular</Label>
            <Input id="website-demo-phone" v-model="phoneValue" type="text" inputmode="tel" required autocomplete="off" placeholder="(00) 00000-0000" />
            <div data-phone-errors aria-live="polite"></div>
          </div>
        </div>
        <Button type="submit">Validar formulário</Button>
      </fieldset>
      <p role="status" aria-live="polite" class="text-sm text-muted-foreground">{{ failed ? 'Não foi possível preparar o formulário. Recarregue a página.' : !ready ? 'Preparando formulário…' : feedback }}</p>
      <noscript>Ative o JavaScript para validar este formulário.</noscript>
    </form>
  </section>
</template>
