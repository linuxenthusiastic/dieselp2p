import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Cliente Supabase (solo anon key). Es null cuando la app corre en modo demo sin Supabase. */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

export const supabaseEnabled = supabase !== null;
