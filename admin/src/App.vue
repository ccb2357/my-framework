<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Button } from '@/components/ui/button';
import Recovery from './pages/Recovery.vue';
import Login from './pages/Login.vue';
import HelloDashboard from './pages/HelloDashboard.vue';
import { adminState, adminAuth } from '@/services/session';
import { adminMessage } from '@/services/auth';
const recoveryPath = window.location.pathname;
const recovery = ['/esqueci-senha/', '/redefinir-senha/'].includes(recoveryPath);
const message = ref(''), loggingOut = ref(false);
async function check() {
  if (loggingOut.value || document.visibilityState === 'hidden') return;
  message.value = ''; try { await adminAuth.check(); } catch (error) { message.value = adminMessage(error); }
}
function offline() { adminAuth.reset('unavailable'); message.value = 'Conecte-se para conferir a sessão administrativa.'; }
async function logout() { if (loggingOut.value) return; loggingOut.value = true; message.value = ''; try { await adminAuth.logout(); } catch (error) { message.value = adminMessage(error); } finally { loggingOut.value = false; } }
onMounted(() => { if (recovery) return; check(); window.addEventListener('focus', check); window.addEventListener('online', check); window.addEventListener('offline', offline); document.addEventListener('visibilitychange', check); });
onBeforeUnmount(() => { adminAuth.reset(); window.removeEventListener('focus', check); window.removeEventListener('online', check); window.removeEventListener('offline', offline); document.removeEventListener('visibilitychange', check); });
</script>
<template>
  <Recovery v-if="recovery" :reset="recoveryPath === '/redefinir-senha/'" />
  <HelloDashboard v-else-if="adminState.status === 'authenticated' && adminState.user" :administrator="adminState.user" :busy="loggingOut" @logout="logout" />
  <Login v-else-if="['guest', 'authenticating'].includes(adminState.status)" />
  <main v-else class="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
    <div class="max-w-md space-y-4" role="status" aria-live="polite"><p>{{ message || (adminState.status === 'ending' ? 'Saindo…' : 'Conferindo sessão administrativa…') }}</p><template v-if="adminState.status === 'unavailable'"><Button @click="check">Conferir acesso</Button><Button variant="outline" :disabled="loggingOut" @click="logout">Sair da conta</Button></template></div>
  </main>
</template>
