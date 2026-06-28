alter table public.categories
  add column if not exists sort_order integer default 0;

alter table public.subcategories
  add column if not exists sort_order integer default 0;

with ordered as (
  select name, row_number() over (order by sort_order, name) - 1 as rn
  from public.categories
)
update public.categories c
set sort_order = ordered.rn
from ordered
where c.name = ordered.name;

with ordered as (
  select category, name, row_number() over (partition by category order by sort_order, name) - 1 as rn
  from public.subcategories
)
update public.subcategories s
set sort_order = ordered.rn
from ordered
where s.category = ordered.category
  and s.name = ordered.name;
