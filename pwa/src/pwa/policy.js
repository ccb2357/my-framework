export function technicalPath(pathname) {
  let path;
  try { path = decodeURIComponent(pathname).toLowerCase(); } catch { return true; }
  return /^\/(api|sanctum|up|status|backend|storage|vendor)(\/|$)/.test(path) || /(^|\/)\./.test(path) || /\.php(\/|$)/.test(path);
}
export function shellPath(pathname) {
  return ['/', '/entrar/', '/cadastro/', '/conta/', '/esqueci-senha/', '/redefinir-senha/'].includes(pathname) || /^\/transition\/(cover-v|dive|fade|parallax)\/?$/.test(pathname);
}
