import type { ZodType } from 'zod';
import { badRequest } from './errors.js';

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`);
    throw badRequest('Datos inválidos', issues);
  }
  return result.data;
}
