<script setup>
const config = useRuntimeConfig().public;
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <a href="#conteudo" class="sr-only focus:not-sr-only focus:block focus:p-4">Ir para o conteúdo</a>
    <header class="border-b bg-card">
      <div class="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
        <SiteIcon class="size-6" />
        <NuxtLink to="/" class="font-semibold focus-visible:outline-2 focus-visible:outline-offset-4">{{ config.name }}</NuxtLink>
        <span class="ml-auto text-sm text-muted-foreground">Website</span>
      </div>
    </header>
    <main id="conteudo" class="mx-auto max-w-5xl px-6 py-12"><slot /></main>
    <footer class="mx-auto max-w-5xl px-6 py-8 text-sm text-muted-foreground">{{ config.name }}</footer>
  </div>
</template>
