import { reactive } from 'vue';
import { createAdminAuth } from './auth.js';
export const adminState = reactive({ status: 'unknown', user: null });
export const adminAuth = createAdminAuth(adminState);
