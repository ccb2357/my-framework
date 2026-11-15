export async function fetchStatus(signal) {
  const response = await fetch('/api/v1/status', { signal, cache: 'no-store', credentials: 'same-origin', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Serviços indisponíveis.');
  const result = await response.json();
  if (result.status !== 'ok' || result.checks?.application !== 'ok' || result.checks?.database !== 'ok') throw new Error('Serviços indisponíveis.');
  return result;
}
