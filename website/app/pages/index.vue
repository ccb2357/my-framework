<script setup>
import { Button } from '~/components/ui/button';
const config = useRuntimeConfig().public;
useHead({ meta: [{ name: 'website-build', content: config.buildId }] });
useSeoMeta({ title: () => `Hello Website · ${config.name}`, description: 'Base para o site institucional e a loja.' });
</script>

<template>
  <section class="rounded-xl border bg-card p-6 shadow-sm sm:p-10" aria-labelledby="hello-title" data-website-hello>
    <p class="mb-3 text-sm font-medium text-muted-foreground">{{ config.name }}</p>
    <h1 id="hello-title" class="text-3xl font-semibold tracking-tight sm:text-4xl">Hello Website</h1>
    <p class="mt-4 max-w-2xl leading-7 text-muted-foreground">Uma base para construir seu site institucional e sua loja.</p>
    <div class="mt-7"><Button as="a" :href="config.pwaUrl"><SiteIcon class="size-4" />Abrir aplicativo</Button></div>
  </section>
  <DemoForm />
</template>
