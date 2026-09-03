import { Link } from "@tanstack/react-router";
import { Heart, Mail, Phone } from "lucide-react";
import { PRODUCTS } from "@/lib/products";
import { REGISTRY_LANDINGS } from "@/lib/seo/registry-landings";
import logoAsset from "@/assets/logo.png.asset.json";
import iso9001Asset from "@/assets/eurocert-iso-9001.png.asset.json";
import iso27001Asset from "@/assets/eurocert-iso-27001.png.asset.json";
import iso22301Asset from "@/assets/eurocert-iso-22301.png.asset.json";

export function SiteFooter() {
  return (
    <footer className="no-print mt-24 border-t bg-sand">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <div className="flex items-center">
            <img
              src={logoAsset.url}
              alt="Cyprus Companies House"
              className="h-8 w-auto"
              width={96}
              height={32}
            />
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            An independent Infocredit Group service providing searchable Cyprus company information, official
            Registrar-issued certificates, company profiles and credit reports.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-medium text-muted-foreground">
            <span className="rounded-full border bg-background px-2.5 py-1">Data protection controls</span>
            <span className="rounded-full border bg-background px-2.5 py-1">Registry-sourced information</span>
            <span className="rounded-full border bg-background px-2.5 py-1">Secure payments</span>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-copper" />
              <a href="tel:+35722398241" className="hover:text-foreground hover:underline">+357 22 398241</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-copper" />
              <a href="mailto:info@companieshousecyprus.com" className="hover:text-foreground hover:underline">info@companieshousecyprus.com</a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Products</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {PRODUCTS.slice(0, 6).map((product) => (
              <li key={product.slug}>
                <Link
                  to="/report/$type"
                  params={{ type: product.slug }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {product.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/cyprus-companies-registry"
                className="text-muted-foreground hover:text-foreground"
              >
                Cyprus companies registry
              </Link>
            </li>
            {REGISTRY_LANDINGS.map((landing) => (
              <li key={landing.slug}>
                <Link
                  to="/registry/$topic"
                  params={{ topic: landing.slug }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {landing.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/company-set-up"
                className="text-muted-foreground hover:text-foreground"
              >
                Set up a Cyprus company
              </Link>
            </li>
            <li>
              <Link
                to="/guides/register-company-cyprus"
                className="text-muted-foreground hover:text-foreground"
              >
                Register a company in Cyprus
              </Link>
            </li>
            <li>
              <Link
                to="/solutions/kyb-for-banks"
                className="text-muted-foreground hover:text-foreground"
              >
                KYB for banks
              </Link>
            </li>

            <li>
              <Link to="/pricing" className="font-medium text-copper hover:underline">
                All pricing
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Company</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link to="/about" className="text-muted-foreground hover:text-foreground">
                About us
              </Link>
            </li>
            <li>
              <Link to="/certifications" className="text-muted-foreground hover:text-foreground">
                Certifications
              </Link>
            </li>
            <li>
              <Link to="/contact" className="text-muted-foreground hover:text-foreground">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/directory" className="text-muted-foreground hover:text-foreground">
                Directory
              </Link>
            </li>
            <li>
              <Link to="/resources" className="text-muted-foreground hover:text-foreground">
                Registry statistics
              </Link>
            </li>
            <li>
              <Link to="/statistics" className="text-muted-foreground hover:text-foreground">
                Statistics dashboard
              </Link>
            </li>

            <li>
              <Link to="/international" className="text-muted-foreground hover:text-foreground">
                International
              </Link>
            </li>
            <li>
              <Link to="/faq" className="text-muted-foreground hover:text-foreground">
                FAQ
              </Link>
            </li>
            <li>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground">
                Terms of service
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link to="/auth" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
            </li>
          </ul>
        </div>

      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Certifications</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Independently audited management systems certified by EUROCERT.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <img
              src={iso9001Asset.url}
              alt="EUROCERT certified management system — ISO 9001:2015"
              className="h-16 w-auto rounded-md bg-background p-1"
              loading="lazy"
            />
            <img
              src={iso27001Asset.url}
              alt="EUROCERT certified management system — ISO/IEC 27001:2023"
              className="h-16 w-auto rounded-md bg-background p-1"
              loading="lazy"
            />
            <img
              src={iso22301Asset.url}
              alt="EUROCERT certified management system — ISO 22301:2019"
              className="h-16 w-auto rounded-md bg-background p-1"
              loading="lazy"
            />
          </div>

        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-6 text-xs leading-relaxed text-muted-foreground">
          <p className="max-w-4xl">
            Companies House Cyprus is an independent digital service operated by{" "}
            <a
              href="https://www.infocreditgroup.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              Infocredit Group Ltd
            </a>
            , a company registered in the Republic of Cyprus under registration number HE4404. Registered office:
            Chatzigeorgiou Filippou 5A, Akropoli, 2006 Nicosia, Cyprus.
          </p>
          <p className="max-w-4xl">
            Companies House Cyprus is not affiliated with, endorsed by, or part of the Government of the Republic of
            Cyprus or the Department of Registrar of Companies and Intellectual Property.
          </p>
          <p>© {new Date().getFullYear()} Companies House Cyprus. Registry-sourced information from the Department of Registrar of Companies and Intellectual Property.</p>
          <p className="flex items-center gap-1">
            <span>Made by</span>
            <a
              href="https://www.blenddigital.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              Blend Digital
            </a>
            <span>with</span>
            <Heart className="h-3 w-3 fill-primary text-primary" aria-hidden="true" />
            <span className="sr-only">love</span>
          </p>

        </div>
      </div>
    </footer>
  );
}
