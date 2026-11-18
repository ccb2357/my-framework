import { reactive } from 'vue';
import { apiRequest } from './api.js';
import { createClientAuth } from './client-auth.js';
export const clientState = reactive({ status: 'unknown', user: null });
export const clientAuth = createClientAuth({ request: apiRequest, state: clientState });
