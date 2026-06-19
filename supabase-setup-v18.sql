-- PROTEX Studio v18
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
