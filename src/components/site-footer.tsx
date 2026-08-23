import { Link } from "@tanstack/react-router";
import { PRODUCTS } from "@/lib/products";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"];
const DISTRICTS = ["Nicosia", "Limassol", "Larnaca", "Paphos", "Famagusta", "Kyrenia"];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-sand">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              CY
            </span>
            <span className="font-display text-sm font-semibold">Companies House Cyprus</span>
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
              <Link to="/pricing" className="font-medium text-copper hover:underline">
                All pricing
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Browse register</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {DISTRICTS.map((district) => (
              <li key={district}>
                <Link
                  to="/companies/city/$district"
                  params={{ district: district.toLowerCase() }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Companies in {district}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {LETTERS.map((letter) => (
              <Link
                key={letter}
                to="/companies/a-z/$letter"
                params={{ letter: letter.toLowerCase() }}
                className="flex size-7 items-center justify-center rounded border bg-background text-xs text-muted-foreground hover:border-copper hover:text-copper"
              >
                {letter}
              </Link>
            ))}
          </div>
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
                Staff sign in
              </Link>
            </li>
          </ul>
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
