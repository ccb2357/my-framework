import { defineEventHandler, getHeader, setHeader, createError } from 'h3';
import { readClientSession } from '../utils/client-session.mjs';
export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store, private');
  const result = await readClientSession(useRuntimeConfig(event).clientBackend, getHeader(event, 'cookie') || '');
  if (result.status !== 200) throw createError({ statusCode: result.status, statusMessage: result.status === 401 ? 'Sessão encerrada.' : 'Não foi possível conferir sua sessão.' });
  return result.body;
});
