create extension if not exists pg_trgm;

drop table if exists public.officials cascade;
drop table if exists public.companies cascade;

create table public.companies (
  slug                text primary key,
  type_code           char(1) not null,
  reg_number          integer not null,
  official_no         text,
  name                text not null,
  type_el             text,
  type_en             text,
  subtype_el          text,
  subtype_en          text,
  status_el           text,
  status_en           text,
  status_group        text not null,
  registration_date   date,
  status_date         date,
  street              text,
  building            text,
  locality            text,
  postcode            text,
  district_el         text,
  district_en         text,
  is_foreign_address  boolean default false,
  address_full        text,
  officials_count     integer default 0,
  a4a_code            text,
  report_years        int[],
  updated_at          timestamptz default now()
);

create table public.officials (
  id           bigserial primary key,
  slug         text not null references public.companies(slug) on delete cascade,
  person_name  text not null,
  position_el  text,
  position_en  text
);

GRANT SELECT ON public.companies TO anon;
GRANT SELECT ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

GRANT SELECT ON public.officials TO anon;
GRANT SELECT ON public.officials TO authenticated;
GRANT ALL ON public.officials TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.officials_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.officials_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.officials_id_seq TO service_role;

alter table public.companies enable row level security;
alter table public.officials enable row level security;

drop policy if exists "public read companies" on public.companies;
drop policy if exists "public read companies authenticated" on public.companies;
create policy "public read companies" on public.companies for select to anon using (true);
create policy "public read companies authenticated" on public.companies for select to authenticated using (true);

drop policy if exists "public read officials" on public.officials;
drop policy if exists "public read officials authenticated" on public.officials;
create policy "public read officials" on public.officials for select to anon using (true);
create policy "public read officials authenticated" on public.officials for select to authenticated using (true);

create index on public.officials (slug);
create index on public.companies (district_en, status_group);
create index on public.companies (status_group);
create index on public.companies (upper(left(name,1)), name);
create index on public.companies using gin (name gin_trgm_ops);
create index on public.companies (address_full);

analyze public.companies;
analyze public.officials;

-- Sample data for immediate route testing. Full 571k load runs separately via setup.sh.
insert into public.companies (
  slug, type_code, reg_number, official_no, name, type_el, type_en, subtype_el, subtype_en,
  status_el, status_en, status_group, registration_date, status_date, street, building,
  locality, postcode, district_el, district_en, is_foreign_address, address_full, officials_count, updated_at
) values
('C252407', 'C', 252407, 'HE252407', 'SOFTBOT SOFTWARE INTELLIGENCE HOUSE (CYPRUS) LIMITED', 'Εταιρεία Ιδιωτική', 'Company', 'Ιδιωτική', 'Private', 'Εγγεγραμμένη', 'Registered', 'active', '2009-07-15', '2009-07-15', 'Θεσσαλονίκης', '50, Floor 1', 'Αραδίππου', '7101', 'Λάρνακα', 'Larnaca', false, 'Θεσσαλονίκης, 50, Floor 1, Αραδίππου, 7101, Λάρνακα, Κύπρος', 2, now()),
('C4404', 'C', 4404, 'HE4404', 'INFOCREDIT GROUP LIMITED', 'Εταιρεία Ιδιωτική', 'Company', 'Ιδιωτική', 'Private', 'Εγγεγραμμένη', 'Registered', 'active', '2000-03-20', '2000-03-20', 'Αρχιεπισκόπου Μακαρίου', '1', 'Λευκωσία', '1010', 'Λευκωσία', 'Nicosia', false, 'Αρχιεπισκόπου Μακαρίου, 1, Λευκωσία, 1010, Λευκωσία, Κύπρος', 1, now()),
('C100000', 'C', 100000, 'HE100000', 'ALPHA MARINE CONSULTING LTD', 'Εταιρεία Ιδιωτική', 'Company', 'Ιδιωτική', 'Private', 'Εγγεγραμμένη', 'Registered', 'active', '2015-05-12', '2015-05-12', 'Λεωφόρος Αμμοχώστου', '21', 'Λεμεσός', '3022', 'Λεμεσός', 'Limassol', false, 'Λεωφόρος Αμμοχώστου, 21, Λεμεσός, 3022, Λεμεσός, Κύπρος', 1, now()),
('C100001', 'C', 100001, 'HE100001', 'BETA TRADING PUBLIC LTD', 'Εταιρεία Δημόσια', 'Company', 'Δημόσια', 'Public', 'Εγγεγραμμένη', 'Registered', 'active', '2016-08-30', '2016-08-30', 'Προδρόμου', '12', 'Στρόβολος', '2004', 'Λευκωσία', 'Nicosia', false, 'Προδρόμου, 12, Στρόβολος, 2004, Λευκωσία, Κύπρος', 0, now()),
('C100002', 'C', 100002, 'HE100002', 'GAMMA PROPERTIES FAMAGUSTA LTD', 'Εταιρεία Ιδιωτική', 'Company', 'Ιδιωτική', 'Private', 'Εγγεγραμμένη', 'Registered', 'active', '2018-01-10', '2018-01-10', 'Παραλίμνι', '7', 'Παραλίμνι', '5280', 'Αμμόχωστος', 'Famagusta', false, 'Παραλίμνι, 7, Παραλίμνι, 5280, Αμμόχωστος, Κύπρος', 0, now()),
('C100003', 'C', 100003, 'HE100003', 'DELTA PAPHOS TOURISM LTD', 'Εταιρεία Ιδιωτική', 'Company', 'Ιδιωτική', 'Private', 'Εγγεγραμμένη', 'Registered', 'active', '2019-04-22', '2019-04-22', 'Ποσειδώνος', '2', 'Πάφος', '8042', 'Πάφος', 'Paphos', false, 'Ποσειδώνος, 2, Πάφος, 8042, Πάφος, Κύπρος', 0, now()),
('C100004', 'C', 100004, 'HE100004', 'EPSILON KYRENIA HOLDINGS LTD', 'Εταιρεία Ιδιωτική', 'Company', 'Ιδιωτική', 'Private', 'Εγγεγραμμένη', 'Registered', 'active', '2020-11-05', '2020-11-05', 'Κερύνεια', '3', 'Κερύνεια', '9930', 'Κερύνεια', 'Kyrenia', false, 'Κερύνεια, 3, Κερύνεια, 9930, Κερύνεια, Κύπρος', 0, now()),
('B5000', 'B', 5000, 'EE5000', 'SAMPLE BUSINESS NAME', 'Επωνυμία Επιχείρησης', 'Business Name', null, null, 'Εγγεγραμμένη', 'Registered', 'active', '2010-06-01', '2010-06-01', 'Λεωφόρος Αρχιεπισκόπου Κυπριανού', '45', 'Λευκωσία', '1010', 'Λευκωσία', 'Nicosia', false, 'Λεωφόρος Αρχιεπισκόπου Κυπριανού, 45, Λευκωσία, 1010, Λευκωσία, Κύπρος', 0, now())
on conflict (slug) do update set updated_at = now();

insert into public.officials (slug, person_name, position_el, position_en) values
('C252407', 'ΒΑΣΙΛΕΙΟΣ ΔΟΝΤΑΣ', 'Διευθυντής', 'Director'),
('C252407', 'ΧΡΙΣΤΙΝΑ ΣΙΗΝΑ', 'Γραμματέας', 'Secretary'),
('C4404', 'ΓΕΩΡΓΙΟΣ ΑΝΔΡΕΟΥ', 'Διευθυντής', 'Director')
on conflict do nothing;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS companies_updated_at ON public.companies;
CREATE TRIGGER companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
