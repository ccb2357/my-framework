import { test, expect, vi } from 'vitest';
import { createClientAuth, authMessage } from '../../src/services/client-auth.js';
import { requireClient, requireGuest } from '../../src/services/client-route.js';
import { apiRequest, ApiError } from '../../src/services/api.js';
const user = { id: 1, name: 'Cliente', email: 'client@example.test' };
function fixture(request) {
  const state = {};
  return { state, auth: createClientAuth({ request, state }) };
}
test('registration submits only permitted fields and keeps a minimal session resource', async () => {
  const request = vi.fn().mockResolvedValue({ user: { ...user, password: 'PRIVATE', role: 'admin' } });
  const f = fixture(request);
  await f.auth.register({ name: 'Cliente', email: user.email, password: 'Secret123!', password_confirmation: 'Secret123!', role: 'admin' });
  expect(request.mock.calls[0][0]).toBe('/api/v1/auth/register');
  expect(request.mock.calls[0][1].json).not.toHaveProperty('role');
  expect(f.state.user).toEqual(user); expect(JSON.stringify(f.state)).not.toContain('PRIVATE');
});
test('a fresh check distinguishes unauthenticated from unavailable instead of trusting cached identity', async () => {
  const request = vi.fn().mockResolvedValueOnce({ user }).mockRejectedValueOnce(new ApiError('', 401)).mockRejectedValueOnce(new Error('network'));
  const f = fixture(request); await f.auth.check(); expect(f.state.user).toEqual(user);
  expect(await f.auth.check()).toBeNull(); expect(f.state.status).toBe('guest');
  await expect(f.auth.check()).rejects.toThrow(); expect(f.state.status).toBe('unavailable'); expect(f.state.user).toBeNull();
});
test('late session response cannot restore an older identity after login', async () => {
  let finish; const request = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce({ user });
  const f = fixture(request), old = f.auth.check();
  await f.auth.login({ email: user.email, password: 'Secret123!' });
  finish({ user: { ...user, id: 2 } }); await old;
  expect(f.state.user).toEqual(user);
});
test('logout clears private UI immediately and waits for the server', async () => {
  let finish; const request = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const f = fixture(request); f.state.user = user;
  const pending = f.auth.logout(); expect(f.state.user).toBeNull();
  finish(null); await pending; expect(f.state.status).toBe('guest');
});
test('failed logout is not announced as completed and expired session is accepted as logged out', async () => {
  const f = fixture(vi.fn().mockRejectedValueOnce(new Error('network')).mockRejectedValueOnce(new ApiError('', 401)));
  await expect(f.auth.logout()).rejects.toThrow(); expect(f.state.status).toBe('unavailable');
  await f.auth.logout(); expect(f.state.status).toBe('guest');
});
test('protected route requires an actual successful check on every entry', async () => {
  for (const result of [null, new Error('network'), user]) {
    const context = { resolve: vi.fn(), reject: vi.fn(), router: { navigate: vi.fn() } };
    const auth = { check: vi.fn().mockImplementation(() => result instanceof Error ? Promise.reject(result) : Promise.resolve(result)) };
    await requireClient(auth, context);
    if (result === user) { expect(context.resolve).toHaveBeenCalledOnce(); expect(context.reject).not.toHaveBeenCalled(); }
    else { expect(context.reject).toHaveBeenCalledOnce(); expect(context.router.navigate).toHaveBeenCalledWith('/entrar/', expect.any(Object)); }
  }
});
test('API validation errors are bounded, field-only and never include arbitrary private response text', async () => {
  await expect(apiRequest('/api/v1/auth/me', { fetcher: async () => new Response(JSON.stringify({ message: 'PRIVATE', trace: 'PRIVATE', errors: { email: ['E-mail inválido'], password: ['x'.repeat(500)], secret: ['PRIVATE'] } }), { status: 422, headers: { 'content-type': 'application/json' } }) })).rejects.toSatisfy(error => error.status === 422 && error.errors.email[0] === 'E-mail inválido' && error.errors.password[0].length === 300 && !JSON.stringify(error).includes('PRIVATE'));
  expect(authMessage(new ApiError('PRIVATE', 429))).toContain('Aguarde');
});

test('already authenticated clients are redirected away from login and registration', async () => {
  const context = { resolve: vi.fn(), reject: vi.fn(), router: { navigate: vi.fn() } };
  await requireGuest({ check: async () => user }, context);
  expect(context.reject).toHaveBeenCalledOnce(); expect(context.router.navigate).toHaveBeenCalledWith('/conta/', expect.any(Object));
});

for (const action of ['login', 'register', 'logout']) {
  test(`session checks and overlapping mutations cannot interfere with pending ${action}`, async () => {
    let finish;
    const request = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue({ user });
    const f = fixture(request);
    const operation = f.auth[action]({ name: user.name, email: user.email, password: 'Secret123!', password_confirmation: 'Secret123!' });
    expect(await f.auth.check()).toBeNull();
    await expect(f.auth.login({})).rejects.toSatisfy(error => error.status === 409);
    await expect(f.auth.logout()).rejects.toSatisfy(error => error.status === 409);
    expect(request).toHaveBeenCalledTimes(1); expect(f.state.user).toBeNull();
    finish(action === 'logout' ? null : { user }); await operation;
    expect(f.state.status).toBe(action === 'logout' ? 'guest' : 'authenticated');
    await f.auth.check(); expect(request).toHaveBeenCalledTimes(2);
  });
}
test('failed login releases mutation lock and permits another attempt', async () => {
  const f = fixture(vi.fn().mockRejectedValueOnce(new ApiError('', 401)).mockResolvedValue({ user }));
  await expect(f.auth.login({})).rejects.toThrow(); expect(f.state.status).toBe('guest');
  await f.auth.login({}); expect(f.state.user).toEqual(user);
});
