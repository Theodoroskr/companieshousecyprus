INSERT INTO public.sanctions_sources (
  source_code,
  source_name,
  authority,
  jurisdiction,
  format_name,
  format_version,
  source_url,
  information_url,
  expected_content_type,
  update_frequency,
  is_active
) VALUES (
  'UKSL',
  'UK Sanctions List',
  'UK Foreign, Commonwealth & Development Office',
  'United Kingdom',
  'UK Sanctions List XML',
  'current',
  'https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.xml',
  'https://www.gov.uk/government/publications/the-uk-sanctions-list',
  'application/xml',
  '4h',
  false
)
ON CONFLICT (source_code) DO NOTHING;