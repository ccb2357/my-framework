// Only controlled application messages belong here; never forward process output.
export function createProgress(output = process.stdout, errors = process.stderr) {
  let stage, timer, frame = 0;
  const animated = Boolean(output.isTTY) && process.env.TERM !== 'dumb';
  const clear = () => { if (timer) { clearInterval(timer); timer = undefined; output.write('\r\x1b[2K'); } };
  const spin = () => {
    if (!animated || !stage) return;
    timer = setInterval(() => output.write(`\r\x1b[2K  ${['|', '/', '-', '\\'][frame++ % 4]} ${stage}`), 120);
    timer.unref();
  };
  const done = () => { clear(); if (stage) output.write('  [OK] Etapa concluída.\n'); stage = undefined; };
  return {
    title(slug, environment) { output.write(`\nMy Framework · ${slug} (${environment})\n`); },
    step(label) { done(); stage = label; output.write(`\n${label}\n`); spin(); },
    info(message) { clear(); output.write(`  ${message}\n`); spin(); },
    success({ pwa, admin, website, build }) {
      done();
      output.write(`\nPreparação concluída\n\n  PWA       ${pwa}\n  Admin     ${admin}\n  Website   ${website}\n\n  Build PWA: ${build}\n  Administrador: crie com admin:create, conforme o manual.\n  Website e PWA compartilham a conta de cliente.\n\nCódigo de saída: 0\nValidação em aparelhos pendente: instalação, offline e atualização.\nAceite final exige validação própria.\n`);
    },
    failure(message, code) {
      clear();
      errors.write(`\n${stage ? `  [${code === 2 ? 'PENDENTE' : 'FALHOU'}] ${stage}\n\n` : ''}${code === 2 ? 'Preparação pendente' : 'Preparação interrompida'}\n\n  Motivo: ${message}\n\nCódigo de saída: ${code}\n`);
      stage = undefined;
    },
    stop: clear,
  };
}
export const progress = createProgress();
