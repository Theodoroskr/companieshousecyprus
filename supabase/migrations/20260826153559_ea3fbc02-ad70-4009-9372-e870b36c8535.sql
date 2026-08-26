INSERT INTO public.sanctions_sources (source_code, source_name, authority, jurisdiction, format_name, format_version, source_url, information_url, expected_content_type, update_frequency, is_active)
VALUES (
  'UN_CONSOLIDATED',
  'United Nations Security Council Consolidated List',
  'United Nations Security Council',
  'United Nations',
  'UN SC Consolidated List',
  'XML',
  'https://scsanctions.un.org/resources/xml/en/consolidated.xml',
  'https://main.un.org/securitycouncil/en/content/un-sc-consolidated-list',
  'application/xml',
  'several times per week',
  false
)
ON CONFLICT (source_code) DO NOTHING;

ALTER TABLE public.sanctions_sources ADD COLUMN IF NOT EXISTS last_connection_test_at timestamptz;
ALTER TABLE public.sanctions_sources ADD COLUMN IF NOT EXISTS last_connection_test_ok boolean;