import Hello from './pages/hello.vue';
import TransitionPage from './pages/transition.vue';
import { clientAuth } from './services/session.js';
import { requireClient, requireGuest } from './services/client-route.js';
import { transitions } from './transitions.js';
export default [
  { path: '/', component: Hello },
  { path: '/esqueci-senha/', asyncComponent: () => import('./pages/recovery.vue') },
  { path: '/redefinir-senha/', asyncComponent: () => import('./pages/recovery.vue'), options: { props: { reset: true } } },
  { path: '/entrar/', asyncComponent: () => import('./pages/access.vue'), beforeEnter: context => requireGuest(clientAuth, context) },
  { path: '/cadastro/', asyncComponent: () => import('./pages/access.vue'), beforeEnter: context => requireGuest(clientAuth, context), options: { props: { registration: true } } },
  { path: '/conta/', asyncComponent: () => import('./pages/account.vue'), beforeEnter: context => requireClient(clientAuth, context) },
  ...transitions.map(effect => ({ path: `/transition/${effect}/`, component: TransitionPage, options: { transition: `f7-${effect}`, props: { effect } } })),
];
