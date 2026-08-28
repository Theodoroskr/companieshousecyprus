# Target "Companies House Cyprus" / "Cyprus Companies House"

Two additions: an explanatory section on the homepage, and a supporting article that can rank on its own and feed links back into the register.

## 1. Homepage section — "What is Companies House Cyprus?"

Added below the hero area, above the existing comparison table:

- Short explainer that "Companies House Cyprus" and "Cyprus Companies House" are the common English names people use for the Cyprus company register, which is officially the Department of Registrar of Companies and Intellectual Property (DRCIP). Cyprus has no body literally named Companies House — that is the UK register.
- Clear statement that this site is an independent commercial service by Infocredit Group Limited (HE4404) that publishes registrar-sourced data and supplies certificates and reports.
- What is free (name/HE-number search, status, type, registration date, registered office) versus what is paid (officials, shareholders, reports, certificates).
- Inline links to: search, the Cyprus companies registry page, directory, pricing, about, and the new article.

## 2. Homepage FAQ additions

Two new entries appended to the existing FAQ list (and therefore to the existing FAQPage structured data, no new schema block):

- "Is there a Companies House in Cyprus?"
- "What is the difference between Companies House Cyprus and the UK Companies House?"

## 3. New article — /guides/companies-house-cyprus

A guide-style page following the same layout as the existing register-company guide:

- H1: "Companies House Cyprus explained: the Cyprus company register"
- Sections: what the term means; who runs the Cyprus register; what the register records; how to search by name and HE number; what registrar numbers (HE, C, EE, S, AE) mean; what documents you can order and turnaround; how Cyprus differs from UK Companies House; where our service fits and what it is not.
- Its own FAQ block with the two homepage questions plus "Is Cyprus company data public?" and "How do I get an official Cyprus certificate?".
- Internal links out to search, registry page, directory, A–Z browse, pricing, about, contact.
- Added as a card on the /guides hub so it is reachable by crawlers.

## 4. Publish

Deploy so the new page and section go live.

## Technical notes

- New route file `src/routes/guides.companies-house-cyprus.tsx` with `head()` supplying unique title, description, og:*, self-referencing canonical and og:url on `https://companieshousecyprus.com/guides/companies-house-cyprus`, plus Article, BreadcrumbList and FAQPage JSON-LD.
- Homepage edits confined to `src/routes/index.tsx`: extend the `FAQS` array (schema regenerates from it) and add one presentational section using existing tokens and card/section patterns. No hardcoded colours.
- Add the new page to the guides list in `src/routes/guides.index.tsx` and to `src/routes/page-sitemap[.]xml.tsx` / the static-page sitemap source so it is indexed.
- No backend, data or pricing changes.
