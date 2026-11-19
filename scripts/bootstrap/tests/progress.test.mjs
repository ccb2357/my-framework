import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import { createProgress } from '../lib/progress.mjs';
function capture(tty = false) {
  let stdout = '', stderr = '';
  return { reporter: createProgress({ isTTY: tty, write: s => { stdout += s; } }, { write: s => { stderr += s; } }), out: () => stdout, err: () => stderr };
}
test('redirected output stays static and success separates addresses and exit status', () => {
  const c = capture();
  c.reporter.title('example', 'local'); c.reporter.step('[1/5] Backend'); c.reporter.info('Dependências preservadas.');
  c.reporter.success({ pwa: 'http://app.example', admin: 'http://admin.example', website: 'http://site.example', build: 'fixture' });
  assert.doesNotMatch(c.out(), /\x1b|\r/);
  assert.match(c.out(), /PWA +http:\/\/app.example\n +Admin +http:\/\/admin.example\n +Website +http:\/\/site.example/);
  assert.match(c.out(), /\nCódigo de saída: 0\n/);
  assert.equal(c.err(), '');
});
test('failures and pending infrastructure never mark unfinished stages complete', () => {
  for (const code of [1, 2]) {
    const c = capture(); c.reporter.step('Website'); c.reporter.failure('Diagnóstico controlado.', code);
    assert.doesNotMatch(c.out(), /OK|concluída/);
    assert.match(c.err(), new RegExp(`Código de saída: ${code}`));
    assert.match(c.err(), code === 2 ? /PENDENTE/ : /FALHOU/);
  }
});
test('interactive spinner stops and clears before failure, without subsequent writes', async () => {
  const c = capture(true); c.reporter.step('Build');
  await setTimeout(150);
  // TERM=dumb deliberately disables animation even in an interactive terminal.
  if (process.env.TERM !== 'dumb') assert.match(c.out(), /\x1b\[2K/);
  c.reporter.failure('Build falhou.', 1);
  const stopped = c.out(); await setTimeout(150);
  assert.equal(c.out(), stopped); assert.doesNotMatch(c.out(), /OK/);
});
