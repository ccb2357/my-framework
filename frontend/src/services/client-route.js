export async function requireClient(auth, { resolve, reject, router }) {
  try { if (await auth.check()) { resolve(); return; } } catch { /* Login page remains available on connection failure. */ }
  reject(); router.navigate('/entrar/', { reloadCurrent: true, animate: false });
}

export async function requireGuest(auth, { resolve, reject, router }) {
  let user;
  try { user = await auth.check(); } catch { /* Form can still report a controlled connection error. */ }
  if (!user) { resolve(); return; }
  reject(); router.navigate('/conta/', { reloadCurrent: true, animate: false });
}
