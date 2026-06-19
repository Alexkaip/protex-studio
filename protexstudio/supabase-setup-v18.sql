-- PROTEX Studio v20
-- In Supabase > SQL Editor ausführen

create table if not exists public.categories (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null unique
);

create table if not exists public.requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  customer_email text,
  note text,
  status text not null default 'Neu',
  order_data jsonb,
  mail_text text,
  layout_images jsonb
);

alter table public.categories enable row level security;
alter table public.requests enable row level security;

drop policy if exists "Kategorien öffentlich lesen" on public.categories;
create policy "Kategorien öffentlich lesen"
on public.categories for select
to anon, authenticated
using (true);

drop policy if exists "Kategorien Admin schreiben" on public.categories;
create policy "Kategorien Admin schreiben"
on public.categories for all
to authenticated
using (true)
with check (true);

drop policy if exists "Anfragen öffentlich erstellen" on public.requests;
create policy "Anfragen öffentlich erstellen"
on public.requests for insert
to anon, authenticated
with check (true);

drop policy if exists "Anfragen Admin lesen" on public.requests;
create policy "Anfragen Admin lesen"
on public.requests for select
to authenticated
using (true);

drop policy if exists "Anfragen Admin bearbeiten" on public.requests;
create policy "Anfragen Admin bearbeiten"
on public.requests for update
to authenticated
using (true)
with check (true);


-- V20: Admin darf erledigte Anfragen löschen
drop policy if exists "Anfragen Admin löschen" on public.requests;
create policy "Anfragen Admin löschen"
on public.requests for delete
to authenticated
using (true);


-- V23: optionale Produktbilder für Ärmel
alter table public.products add column if not exists image_left_sleeve text;
alter table public.products add column if not exists image_right_sleeve text;


-- V25: Einstellungen für Mengenrabatte
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "Settings öffentlich lesen" on public.settings;
create policy "Settings öffentlich lesen"
on public.settings for select
to anon, authenticated
using (true);

drop policy if exists "Settings Admin schreiben" on public.settings;
create policy "Settings Admin schreiben"
on public.settings for all
to authenticated
using (true)
with check (true);

insert into public.settings (key,value)
values ('quantity_discounts','[{"min_qty":10,"discount_percent":5},{"min_qty":25,"discount_percent":10},{"min_qty":50,"discount_percent":15},{"min_qty":100,"discount_percent":20}]'::jsonb)
on conflict (key) do nothing;
