import { defineEventHandler, setHeader, createError } from 'h3';
import { readPublicContent } from '../utils/public-content.mjs';
export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store');
  const result = await readPublicContent(useRuntimeConfig(event).clientBackend);
  if (result.status !== 200) throw createError({ statusCode: result.status, statusMessage: result.status === 429 ? 'Aguarde antes de atualizar novamente.' : 'Conteúdo temporariamente indisponível.' });
  return result.body;
});
