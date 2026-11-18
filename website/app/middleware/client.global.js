export default defineNuxtRouteMiddleware(async to => {
  if (!to.meta.clientOnly && !to.meta.guestOnly) return;
  const { auth } = useClientSession();
  let user;
  try { user = await auth.check(); }
  catch { if (to.meta.clientOnly) throw createError({ statusCode: 503, statusMessage: 'Não foi possível conferir sua sessão. Tente novamente.' }); return; }
  if (to.meta.clientOnly && !user) return navigateTo('/entrar/', { replace: true });
  if (to.meta.guestOnly && user) return navigateTo('/conta/', { replace: true });
});
