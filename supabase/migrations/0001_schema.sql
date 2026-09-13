-- DieselP2P · Esquema PostgreSQL (Supabase)
-- MVP DEMO — DATOS SIMULADOS. Ninguna tabla representa operaciones reales.

create extension if not exists "pgcrypto";

-- ---------- PERFILES ----------
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  email text not null unique,
  phone text,
  role text not null check (role in ('producer','supplier','carrier','admin')),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);

create table if not exists producer_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  organization_name text not null,
  activity_type text not null,
  nit_demo text not null,
  location_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

create table if not exists supplier_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  business_name text not null,
  verification_status text not null default 'PENDING' check (verification_status in ('PENDING','VERIFIED','REJECTED')),
  location_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  capacity_liters integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists carrier_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  company_name text not null,
  vehicle_type text not null,
  capacity_liters integer not null default 0,
  coverage_area text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

-- ---------- MERCADO ----------
create table if not exists demands (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references producer_profiles (id) on delete cascade,
  requested_liters integer not null check (requested_liters > 0),
  remaining_liters integer not null check (remaining_liters >= 0),
  target_price numeric(10,2),
  required_date date not null,
  location_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  activity_type text not null,
  status text not null default 'OPEN' check (status in ('OPEN','PARTIALLY_MATCHED','MATCHED','IN_PROGRESS','COMPLETED','CANCELLED')),
  created_at timestamptz not null default now()
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references supplier_profiles (id) on delete cascade,
  available_liters integer not null check (available_liters > 0),
  remaining_liters integer not null check (remaining_liters >= 0),
  price_per_liter numeric(10,2) not null check (price_per_liter > 0),
  available_date date not null,
  location_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PARTIALLY_ALLOCATED','FULLY_ALLOCATED','EXPIRED','CANCELLED')),
  created_at timestamptz not null default now()
);

-- ---------- MATCHING (multi-proveedor) ----------
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references demands (id) on delete cascade,
  status text not null default 'PROPOSED' check (status in ('PROPOSED','CONFIRMED','CANCELLED')),
  total_liters integer not null,
  total_fuel_cost numeric(12,2) not null,
  estimated_transport_cost numeric(12,2) not null,
  estimated_total_cost numeric(12,2) not null,
  estimated_savings numeric(12,2) not null,
  savings_percent numeric(6,1) not null default 0,
  reference_cost numeric(12,2) not null default 0,
  score integer not null check (score between 0 and 100),
  score_breakdown jsonb not null default '{}'::jsonb,
  explanation jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Un match puede combinar VARIAS ofertas: 10.000 L = 7.000 L + 3.000 L
create table if not exists match_items (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  offer_id uuid not null references offers (id) on delete restrict,
  allocated_liters integer not null check (allocated_liters > 0),
  price_per_liter numeric(10,2) not null,
  distance_km numeric(8,1) not null,
  transport_cost numeric(12,2) not null,
  subtotal numeric(12,2) not null
);

-- ---------- LOGÍSTICA Y TRAZABILIDAD ----------
create table if not exists transport_orders (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  match_item_id uuid references match_items (id) on delete set null,
  carrier_id uuid references carrier_profiles (id) on delete set null,
  origin_name text not null,
  origin_latitude double precision not null,
  origin_longitude double precision not null,
  destination_name text not null,
  destination_latitude double precision not null,
  destination_longitude double precision not null,
  liters integer not null default 0,
  distance_km numeric(8,1) not null,
  estimated_cost numeric(12,2) not null,
  status text not null default 'PENDING' check (status in ('PENDING','ASSIGNED','IN_TRANSIT','DELIVERED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists operations (
  id uuid primary key default gen_random_uuid(),
  operation_code text not null unique,
  match_id uuid not null references matches (id) on delete cascade,
  producer_id uuid not null references producer_profiles (id) on delete cascade,
  status text not null default 'CREATED' check (status in ('CREATED','ASSIGNED','IN_TRANSIT','DELIVERED','CANCELLED')),
  verification_status text not null default 'VERIFIED' check (verification_status in ('PENDING','VERIFIED','REJECTED')),
  qr_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists anomaly_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  operation_id uuid references operations (id) on delete set null,
  type text not null check (type in ('UNUSUAL_VOLUME','FREQUENT_REQUESTS','RAPID_RESALE_PATTERN','MULTIPLE_LOCATIONS','OTHER')),
  risk_score integer not null check (risk_score between 0 and 100),
  description text not null,
  status text not null default 'OPEN' check (status in ('OPEN','REVIEWED','DISMISSED')),
  created_at timestamptz not null default now()
);

create index if not exists idx_demands_producer on demands (producer_id);
create index if not exists idx_demands_status on demands (status);
create index if not exists idx_offers_supplier on offers (supplier_id);
create index if not exists idx_offers_status on offers (status);
create index if not exists idx_match_items_match on match_items (match_id);
create index if not exists idx_transport_match on transport_orders (match_id);
create index if not exists idx_transport_carrier on transport_orders (carrier_id);
create index if not exists idx_operations_match on operations (match_id);
create index if not exists idx_anomaly_profile on anomaly_events (profile_id);

-- ---------- ROW LEVEL SECURITY ----------
-- El backend Node.js usa la service role key (omite RLS). Estas políticas
-- protegen el acceso directo con la anon key desde el navegador.
alter table profiles enable row level security;
alter table producer_profiles enable row level security;
alter table supplier_profiles enable row level security;
alter table carrier_profiles enable row level security;
alter table demands enable row level security;
alter table offers enable row level security;
alter table matches enable row level security;
alter table match_items enable row level security;
alter table transport_orders enable row level security;
alter table operations enable row level security;
alter table anomaly_events enable row level security;

drop policy if exists "profiles: leer propio" on profiles;
create policy "profiles: leer propio" on profiles for select using (auth.uid() = user_id);

drop policy if exists "profiles: actualizar propio" on profiles;
create policy "profiles: actualizar propio" on profiles for update using (auth.uid() = user_id);

-- Visibilidad de mercado para usuarios autenticados (solo lectura)
drop policy if exists "offers: lectura autenticada" on offers;
create policy "offers: lectura autenticada" on offers for select to authenticated using (true);

drop policy if exists "demands: lectura autenticada" on demands;
create policy "demands: lectura autenticada" on demands for select to authenticated using (true);

drop policy if exists "supplier_profiles: lectura autenticada" on supplier_profiles;
create policy "supplier_profiles: lectura autenticada" on supplier_profiles for select to authenticated using (true);
