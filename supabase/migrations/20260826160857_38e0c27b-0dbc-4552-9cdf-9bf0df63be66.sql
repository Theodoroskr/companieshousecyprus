INSERT INTO public.sanctions_sources (
  source_code, source_name, authority, jurisdiction,
  format_name, format_version, source_url, information_url,
  expected_content_type, update_frequency, is_active
) VALUES (
  'OFAC_SDN',
  'OFAC Specially Designated Nationals and Blocked Persons List',
  'U.S. Department of the Treasury - Office of Foreign Assets Control',
  'US',
  'OFAC Advanced XML',
  '3',
  'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/ADVANCED_XML',
  'https://ofac.treasury.gov/specially-designated-nationals-and-blocked-persons-list-sdn-human-readable-lists',
  'application/xml',
  'daily',
  false
) ON CONFLICT (source_code) DO UPDATE SET
  source_name = excluded.source_name,
  authority = excluded.authority,
  source_url = excluded.source_url,
  information_url = excluded.information_url,
  format_name = excluded.format_name,
  format_version = excluded.format_version;