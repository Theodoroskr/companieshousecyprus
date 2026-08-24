CREATE TABLE public.guide_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_type text NOT NULL CHECK (lead_type IN ('guide_download','specialist_introduction')),
  form_source text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  telephone text,
  country text NOT NULL,
  nationality text,
  business_activity text NOT NULL,
  countries_of_operation text,
  shareholder_count text,
  corporate_shareholder boolean,
  timeframe text NOT NULL,
  services_requested text[] NOT NULL DEFAULT '{}',
  consent_text_version text NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  landing_page text,
  referral_url text,
  lead_status text NOT NULL DEFAULT 'new' CHECK (lead_status IN ('new','under_review','more_information_required','approved_for_introduction','referred','contacted','converted','not_eligible','closed')),
  assigned_partner text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.guide_leads TO service_role;
GRANT SELECT, UPDATE ON public.guide_leads TO authenticated;
ALTER TABLE public.guide_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read guide leads" ON public.guide_leads
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update guide leads" ON public.guide_leads
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX guide_leads_created_at_idx ON public.guide_leads (created_at DESC);
CREATE INDEX guide_leads_email_idx ON public.guide_leads (lower(email));

CREATE TRIGGER guide_leads_set_updated_at BEFORE UPDATE ON public.guide_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.guide_editorial (
  guide_slug text PRIMARY KEY,
  date_published date NOT NULL,
  last_reviewed date NOT NULL,
  reviewer_name text NOT NULL,
  reviewer_role text NOT NULL,
  legal_disclaimer text NOT NULL,
  tax_disclaimer text NOT NULL,
  official_source_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  guide_version text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.guide_editorial TO service_role;
GRANT SELECT ON public.guide_editorial TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.guide_editorial TO authenticated;
ALTER TABLE public.guide_editorial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guide editorial is public" ON public.guide_editorial
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage guide editorial" ON public.guide_editorial
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER guide_editorial_set_updated_at BEFORE UPDATE ON public.guide_editorial
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.guide_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_slug text NOT NULL,
  label text NOT NULL,
  amount text NOT NULL,
  note text,
  source_url text,
  last_verified date,
  needs_verification boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.guide_fees TO service_role;
GRANT SELECT ON public.guide_fees TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.guide_fees TO authenticated;
ALTER TABLE public.guide_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guide fees are public" ON public.guide_fees
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage guide fees" ON public.guide_fees
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX guide_fees_slug_idx ON public.guide_fees (guide_slug, sort_order);

CREATE TRIGGER guide_fees_set_updated_at BEFORE UPDATE ON public.guide_fees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.guide_editorial (guide_slug, date_published, last_reviewed, reviewer_name, reviewer_role, legal_disclaimer, tax_disclaimer, official_source_links, guide_version)
VALUES (
  'register-company-cyprus',
  '2026-01-15',
  '2026-08-24',
  'Companies House Cyprus editorial team',
  'Registry research and data operations',
  'This guide is provided for general information only and does not constitute legal, tax, accounting, financial or investment advice. Requirements may vary according to the proposed activities, ownership structure, jurisdictions involved and applicable law. CompaniesHouseCyprus.com is an independent information service and is not affiliated with the Government of the Republic of Cyprus. Where requested and appropriate, we may introduce users to independent professional service providers.',
  'Tax and VAT treatment depends on the company''s activities, management, ownership and the jurisdictions involved. Rates, thresholds and filing obligations change. Obtain personalised advice from a qualified Cyprus tax adviser before relying on any figure in this guide.',
  '[{"label":"Department of Registrar of Companies and Intellectual Property","url":"https://www.companies.gov.cy/en/"},{"label":"Registrar of Companies — company registration information","url":"https://www.companies.gov.cy/en/services/company/registration"},{"label":"Tax Department of the Republic of Cyprus","url":"https://www.mof.gov.cy/mof/tax/taxdep.nsf/index_en/index_en"}]'::jsonb,
  '2026.1'
);

INSERT INTO public.guide_fees (guide_slug, label, amount, note, source_url, last_verified, needs_verification, sort_order) VALUES
  ('register-company-cyprus','Company name approval application','Verify with the Registrar','Official fee — confirm the current amount and any expedited option before quoting.','https://www.companies.gov.cy/en/',NULL,true,1),
  ('register-company-cyprus','Incorporation filing fee','Verify with the Registrar','Official fee, may vary with authorised share capital and filing method.','https://www.companies.gov.cy/en/',NULL,true,2),
  ('register-company-cyprus','Expedited (accelerated) processing','Verify availability','Availability and surcharge are set by the Registrar and change from time to time.','https://www.companies.gov.cy/en/',NULL,true,3),
  ('register-company-cyprus','Certified copies, apostille and courier','Verify per document','Depends on the number of documents, certification type and destination country.',NULL,NULL,true,4),
  ('register-company-cyprus','Professional formation fees','Available upon quotation','Set independently by each licensed provider.',NULL,'2026-08-24',false,5),
  ('register-company-cyprus','Registered office and company secretarial services','Available upon quotation','Usually charged annually by the service provider.',NULL,'2026-08-24',false,6),
  ('register-company-cyprus','Tax, VAT and employer registration assistance','Available upon quotation','Scope depends on activities, payroll and VAT position.',NULL,'2026-08-24',false,7),
  ('register-company-cyprus','Accounting, audit and annual compliance','Available upon quotation','Driven by transaction volume and audit requirements.',NULL,'2026-08-24',false,8);
