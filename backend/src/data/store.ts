import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TableMap, TableName } from '../types/domain.js';
import { env, supabaseConfigured } from '../config.js';
import { buildSeed } from './seedData.js';
import { HttpError } from '../utils/errors.js';

type Row<T extends TableName> = TableMap[T];
type Filter<T extends TableName> = Partial<Row<T>>;

/**
 * Abstracción mínima de persistencia.
 * - MemoryStore: datos seed en memoria (demo inmediata sin credenciales).
 * - SupabaseStore: PostgreSQL vía service role (backend únicamente).
 */
export interface Store {
  readonly kind: 'memory' | 'supabase';
  list<T extends TableName>(table: T, filter?: Filter<T>): Promise<Row<T>[]>;
  get<T extends TableName>(table: T, id: string): Promise<Row<T> | null>;
  insert<T extends TableName>(table: T, row: Row<T>): Promise<Row<T>>;
  update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>): Promise<Row<T>>;
  count<T extends TableName>(table: T): Promise<number>;
  reset?(): Promise<void>;
}

function matches<T extends TableName>(row: Row<T>, filter?: Filter<T>) {
  if (!filter) return true;
  return Object.entries(filter).every(([k, v]) => (row as unknown as Record<string, unknown>)[k] === v);
}

export class MemoryStore implements Store {
  readonly kind = 'memory' as const;
  private tables = new Map<TableName, Map<string, unknown>>();

  constructor() {
    this.load();
  }

  private load() {
    this.tables.clear();
    const seed = buildSeed();
    for (const [table, rows] of Object.entries(seed) as [TableName, { id: string }[]][]) {
      const map = new Map<string, unknown>();
      for (const r of rows) map.set(r.id, structuredClone(r));
      this.tables.set(table, map);
    }
  }

  private table<T extends TableName>(name: T): Map<string, Row<T>> {
    let t = this.tables.get(name);
    if (!t) {
      t = new Map();
      this.tables.set(name, t);
    }
    return t as Map<string, Row<T>>;
  }

  async list<T extends TableName>(table: T, filter?: Filter<T>) {
    return [...this.table(table).values()].filter((r) => matches(r, filter)).map((r) => structuredClone(r));
  }

  async get<T extends TableName>(table: T, id: string) {
    const r = this.table(table).get(id);
    return r ? structuredClone(r) : null;
  }

  async insert<T extends TableName>(table: T, row: Row<T>) {
    this.table(table).set(row.id, structuredClone(row));
    return structuredClone(row);
  }

  async update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>) {
    const t = this.table(table);
    const current = t.get(id);
    if (!current) throw new HttpError(404, `${table}/${id} no encontrado`);
    const next = { ...current, ...patch };
    t.set(id, next);
    return structuredClone(next);
  }

  async count<T extends TableName>(table: T) {
    return this.table(table).size;
  }

  async reset() {
    this.load();
  }
}

export class SupabaseStore implements Store {
  readonly kind = 'supabase' as const;
  readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  }

  async list<T extends TableName>(table: T, filter?: Filter<T>) {
    let q = this.client.from(table).select('*');
    if (filter) q = q.match(filter as Record<string, unknown>);
    const { data, error } = await q.limit(2000);
    if (error) throw new HttpError(500, `Supabase: ${error.message}`);
    return (data ?? []) as Row<T>[];
  }

  async get<T extends TableName>(table: T, id: string) {
    const { data, error } = await this.client.from(table).select('*').eq('id', id).maybeSingle();
    if (error) throw new HttpError(500, `Supabase: ${error.message}`);
    return (data as Row<T>) ?? null;
  }

  async insert<T extends TableName>(table: T, row: Row<T>) {
    const { data, error } = await this.client.from(table).insert(row as never).select('*').single();
    if (error) throw new HttpError(500, `Supabase: ${error.message}`);
    return data as Row<T>;
  }

  async update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>) {
    const { data, error } = await this.client.from(table).update(patch as never).eq('id', id).select('*').single();
    if (error) throw new HttpError(500, `Supabase: ${error.message}`);
    return data as Row<T>;
  }

  async count<T extends TableName>(table: T) {
    const { count, error } = await this.client.from(table).select('id', { count: 'exact', head: true });
    if (error) throw new HttpError(500, `Supabase: ${error.message}`);
    return count ?? 0;
  }
}

export const store: Store = supabaseConfigured
  ? new SupabaseStore(env.supabaseUrl, env.supabaseServiceRoleKey)
  : new MemoryStore();

export const supabaseAdmin: SupabaseClient | null =
  store.kind === 'supabase' ? (store as SupabaseStore).client : null;
