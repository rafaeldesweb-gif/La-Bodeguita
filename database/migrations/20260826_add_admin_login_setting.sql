-- Ejecuta este archivo una vez en Supabase SQL Editor.
create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  admin_email text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, admin_email)
values (true, 'rafael_o_maitin@yahoo.es')
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles profile
    join auth.users auth_user on auth_user.id = profile.id
    join public.app_settings settings on settings.id = true
    where profile.id = (select auth.uid())
      and profile.role = 'admin'
      and lower(auth_user.email) = lower(settings.admin_email)
  );
$$;

drop policy if exists "Anyone can read administrator email" on public.app_settings;
create policy "Anyone can read administrator email"
on public.app_settings for select to anon, authenticated
using (true);

drop policy if exists "Current admin updates administrator email" on public.app_settings;
create policy "Current admin updates administrator email"
on public.app_settings for update to authenticated
using ((select private.is_admin()))
with check (true);
