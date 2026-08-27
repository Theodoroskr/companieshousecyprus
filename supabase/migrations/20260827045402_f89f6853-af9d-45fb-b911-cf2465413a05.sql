alter table public.order_items add column if not exists screening_outcome text;

update public.order_items
set screening_outcome = report_json->>'outcome'
where product_slug = 'sanctions-risk-snapshot'
  and report_json is not null
  and screening_outcome is null;