export function publicContentResource(body) {
  if (!body || typeof body !== 'object' || !Object.hasOwn(body, 'data')) throw new Error('Conteúdo inválido.');
  if (body.data === null) return { data: null };
  const item = body.data;
  if (typeof item?.title !== 'string' || !item.title.trim() || Array.from(item.title).length > 160 || typeof item.body !== 'string' || !item.body.trim() || Array.from(item.body).length > 2000 || /\0/.test(item.title + item.body) || typeof item.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(item.updatedAt) || !Number.isFinite(Date.parse(item.updatedAt)) || new Date(item.updatedAt).toISOString().replace('.000Z', 'Z') !== item.updatedAt) throw new Error('Conteúdo inválido.');
  // Explicit public resource: extra fields, even from an upstream error, never reach the page.
  return { data: { title: item.title, body: item.body, updatedAt: item.updatedAt } };
}
