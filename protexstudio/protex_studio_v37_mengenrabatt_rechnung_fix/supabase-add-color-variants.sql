alter table products
add column if not exists color_variants jsonb not null default '[]'::jsonb;
