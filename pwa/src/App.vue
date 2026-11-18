<template>
  <f7-app v-bind="params">
    <f7-view main :url="initialUrl" :browser-history="true" browser-history-separator="" :animate="!reducedMotion" />
  </f7-app>
</template>
<script setup>
import { appConfig } from './config.js';
import routes from './routes.js';
const initialUrl = window.location.pathname + window.location.search;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = { name: appConfig.name, id: `app.${appConfig.slug}`, theme: 'auto', routes, dialog: { buttonOk: 'OK', buttonCancel: 'Cancelar' } };
</script>
