alter table categories
add column if not exists image_url text;

alter table subcategories
add column if not exists image_url text;
