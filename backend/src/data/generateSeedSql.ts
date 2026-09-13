/**
 * Genera supabase/seed.sql a partir de seedData.ts (única fuente de verdad).
 *   npm run seed:sql
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSeed } from './seedData.js';
import { TABLE_NAMES } from '../types/domain.js';

const JSON_COLUMNS = new Set(['score_breakdown', 'explanation']);

function literal(value: unknown, column: string): string {
  if (value === null || value === undefined) return 'NULL';
  if (JSON_COLUMNS.has(column)) return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return `'${String(value).replace(/'/g, "''")}'`;
}

const seed = buildSeed();
const lines: string[] = [
  '-- DieselP2P · Seed de datos SIMULADOS (generado por backend: npm run seed:sql)',
  '-- MVP DEMO — DATOS SIMULADOS. No representan datos oficiales ni personas reales.',
  '',
  'begin;',
  `truncate table ${[...TABLE_NAMES].reverse().join(', ')} restart identity cascade;`,
  '',
];

for (const table of TABLE_NAMES) {
  const rows = seed[table] as unknown as Record<string, unknown>[];
  if (rows.length === 0) continue;
  const columns = Object.keys(rows[0]);
  lines.push(`-- ${table} (${rows.length})`);
  lines.push(`insert into ${table} (${columns.join(', ')}) values`);
  lines.push(rows.map((r) => `  (${columns.map((c) => literal(r[c], c)).join(', ')})`).join(',\n') + ';');
  lines.push('');
}
lines.push('commit;');

const out = resolve(process.cwd(), '..', 'supabase', 'seed.sql');
writeFileSync(out, lines.join('\n'));
console.log(`seed.sql generado → ${out} (${TABLE_NAMES.map((t) => `${t}: ${seed[t].length}`).join(', ')})`);
