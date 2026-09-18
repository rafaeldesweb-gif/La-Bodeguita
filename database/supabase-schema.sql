-- La Bodeguita: esquema inicial para Supabase (Postgres).
-- Ejecuta este archivo completo en Supabase Dashboard > SQL Editor.
-- Antes de usar el panel, crea el usuario administrador en Authentication y
-- cambia su rol en `public.profiles` a `admin`.

do $$
begin
  create type public.order_status as enum ('NUEVOS', 'EN PREPARACIÓN', 'LISTOS', 'ENTREGADOS');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_type as enum ('Table', 'Delivery', 'Pickup');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.app_role as enum ('customer', 'admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cada cuenta de Supabase Auth recibe un perfil sin privilegios por defecto.
-- Los administradores se promocionan explícitamente desde el SQL Editor.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _role public.app_role;
  _count int;
begin
  -- Intentar obtener el rol del metadata con fallback seguro a customer
  begin
    _role := (new.raw_user_meta_data ->> 'role')::public.app_role;
  exception when others then
    _role := 'customer'::public.app_role;
  end;

  -- Si es el primer usuario en la plataforma, hacerlo admin automáticamente
  select count(*) into _count from public.profiles;
  if _count = 0 then
    _role := 'admin'::public.app_role;
  end if;

  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(_role, 'customer'::public.app_role)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  description text not null,
  price numeric(10,2) not null check (price >= 0),
  category text not null check (category in ('hamburguesas', 'acompañantes', 'bebidas')),
  image text not null,
  badge text,
  customizable boolean not null default false,
  is_featured boolean not null default false,
  prep_time_minutes integer check (prep_time_minutes is null or prep_time_minutes >= 0),
  ingredients jsonb not null default '[]'::jsonb,
  default_removals jsonb not null default '[]'::jsonb,
  available_extras jsonb not null default '[]'::jsonb,
  available_sauces jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  customer_name text,
  order_type public.order_type not null,
  location_detail text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  total numeric(10,2) not null check (total >= 0),
  status public.order_status not null default 'NUEVOS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_customer_created_at_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_status_created_at_idx on public.orders (status, created_at desc);

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile details" on public.profiles;
create policy "Users can update their own profile details"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id and role = (select role from public.profiles where id = (select auth.uid())));

drop policy if exists "Anyone can read the menu" on public.menu_items;
create policy "Anyone can read the menu"
on public.menu_items for select to anon, authenticated
using (true);

drop policy if exists "Admins manage the menu" on public.menu_items;
create policy "Admins manage the menu"
on public.menu_items for all to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Customers create their own orders" on public.orders;
create policy "Customers create their own orders"
on public.orders for insert to authenticated
with check ((select auth.uid()) = customer_id);

drop policy if exists "Customers read their orders and admins read all" on public.orders;
create policy "Customers read their orders and admins read all"
on public.orders for select to authenticated
using ((select auth.uid()) = customer_id or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders"
on public.orders for update to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists menu_items_set_updated_at on public.menu_items;
create trigger menu_items_set_updated_at before update on public.menu_items
for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

-- Reemplaza el UUID por el ID del usuario administrador creado en Authentication.
-- update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000000';

-- ==========================================================
-- TICKET NUMBERS: Daily Resetting Sequences for Orders
-- ==========================================================

create table if not exists public.order_sequences (
  date_prefix text primary key,
  last_value integer not null default 0
);

-- Note: Depending on your existing data, this might fail if ids conflict, but it's safe if it was uuid previously.
alter table public.orders alter column id drop default;
alter table public.orders alter column id type text using id::text;

create or replace function public.set_order_daily_id()
returns trigger as $$$
declare
  today_prefix text;
  seq_val integer;
begin
  -- E.g. '20260827'
  today_prefix := to_char(now(), 'YYYYMMDD');

  insert into public.order_sequences(date_prefix, last_value)
  values (today_prefix, 1)
  on conflict (date_prefix)
  do update set last_value = public.order_sequences.last_value + 1
  returning last_value into seq_val;

  new.id := today_prefix || '-' || lpad(seq_val::text, 4, '0');
  
  return new;
end;
$$$ language plpgsql;

drop trigger if exists trigger_set_order_daily_id on public.orders;
create trigger trigger_set_order_daily_id
before insert on public.orders
for each row
execute function public.set_order_daily_id();

-- ==========================================================
-- APP SETTINGS
-- ==========================================================

create table if not exists public.app_settings (
  id boolean primary key default true,
  admin_email text not null default 'bodeadmin@gmail.com',
  constraint app_settings_single_row check (id)
);
insert into public.app_settings (id, admin_email) values (true, 'bodeadmin@gmail.com') on conflict do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "Enable read access for all users on app_settings" on public.app_settings;
create policy "Enable read access for all users on app_settings"
  on public.app_settings for select
  using (true);

drop policy if exists "Enable update for admins on app_settings" on public.app_settings;
create policy "Enable update for admins on app_settings"
  on public.app_settings for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles admin_prof
      where admin_prof.id = auth.uid()
      and admin_prof.role = 'admin'
    )
  );

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles admin_prof
      where admin_prof.id = auth.uid()
      and admin_prof.role = 'admin'
    )
  );
