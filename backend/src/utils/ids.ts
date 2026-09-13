import { randomBytes, randomUUID } from 'node:crypto';

export const newId = () => randomUUID();

export const nowIso = () => new Date().toISOString();

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const newQrToken = () => randomBytes(12).toString('hex');

/** Genera un código de operación tipo D2P-2026-000001. */
export function operationCode(sequence: number, year = new Date().getFullYear()) {
  return `D2P-${year}-${String(sequence).padStart(6, '0')}`;
}

/** UUID determinístico para datos seed (formato válido v4). */
export function seedId(block: string, n: number): string {
  const hex = block.padEnd(8, '0').slice(0, 8);
  return `${hex}-0000-4000-8000-${String(n).padStart(12, '0')}`;
}
