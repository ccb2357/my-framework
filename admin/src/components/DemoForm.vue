<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { initDemoForm } from '@/forms/demo';
const form = ref(null), feedback = ref(''), phoneValue = ref('');
let controller;
onMounted(() => { controller = initDemoForm(form.value, () => { feedback.value = 'Campos válidos. Nenhum dado foi salvo ou enviado.'; }, value => { phoneValue.value = value; }); });
onBeforeUnmount(() => controller?.destroy());
</script>
<template>
  <Card>
    <CardHeader>
      <CardTitle>Formulário de demonstração</CardTitle>
      <CardDescription>Máscaras e validações compartilhadas com a PWA. Os dados não são enviados nem salvos.</CardDescription>
    </CardHeader>
    <CardContent>
      <form ref="form" novalidate aria-label="Formulário de demonstração" class="space-y-5" @input="feedback = ''">
        <div class="grid gap-5 md:grid-cols-2">
          <div class="space-y-2">
            <Label for="admin-demo-email">E-mail</Label>
            <Input id="admin-demo-email" type="email" required autocomplete="off" placeholder="voce@exemplo.com" />
            <div data-email-errors aria-live="polite"></div>
          </div>
          <div class="space-y-2">
            <Label for="admin-demo-phone">Celular</Label>
            <Input v-model="phoneValue" id="admin-demo-phone" type="text" inputmode="tel" required autocomplete="off" placeholder="(00) 00000-0000" />
            <div data-phone-errors aria-live="polite"></div>
          </div>
        </div>
        <Button type="submit">Validar formulário</Button>
        <p role="status" aria-live="polite" class="text-sm text-muted-foreground">{{ feedback }}</p>
      </form>
    </CardContent>
  </Card>
</template>
