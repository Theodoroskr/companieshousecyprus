import { Link } from "@tanstack/react-router";
import { Mail, Phone } from "lucide-react";
import { PRODUCTS } from "@/lib/products";
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
            Open access to the Cyprus register of companies, with certified certificates and company intelligence
            delivered digitally.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-medium text-muted-foreground">
            <span className="rounded-full border bg-background px-2.5 py-1">GDPR compliant</span>
            <span className="rounded-full border bg-background px-2.5 py-1">Registrar sourced</span>
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
              <Link to="/resources" className="text-muted-foreground hover:text-foreground">
                Registry statistics
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
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Companies House Cyprus. Data sourced from the Department of Registrar of Companies.</p>
          <p>Not affiliated with the Government of the Republic of Cyprus.</p>
        </div>
      </div>
    </footer>
  );
}
