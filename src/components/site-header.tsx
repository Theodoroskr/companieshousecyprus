import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ShoppingCart, ChevronDown, Menu, X, ArrowRight, ShieldCheck } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAccount } from "@/hooks/useAccount";
import { PRODUCTS, formatPrice } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import logoAsset from "@/assets/logo.png.asset.json";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";



export function SiteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const signInRedirect = location.pathname + location.searchStr;
  const { count } = useCart();
  const account = useAccount();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/search", search: { q: q.trim(), page: 1 } });
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex shrink-0 items-center">
          <img
            src={logoAsset.url}
            alt="Cyprus Companies House"
            className="h-8 w-auto sm:h-9"
            width={108}
            height={36}
          />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 text-sm lg:flex">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Products <ChevronDown className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="w-[min(640px,calc(100vw-32px))] rounded-xl border border-border/70 bg-popover p-4 shadow-lift"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Certificates */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-copper">Certificates</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatPrice(PRODUCTS.find((p) => p.category === "certificate")?.price ?? 40)} each
                  </p>

                  <div className="mt-3 grid gap-0.5">
                    {PRODUCTS.filter((p) => p.category === "certificate").map((product) => (
                      <DropdownMenuItem key={product.slug} asChild className="p-0">
                        <Link
                          to="/report/$type"
                          params={{ type: product.slug }}
                          className="flex items-start justify-between gap-3 rounded-md px-2 py-2 text-sm outline-none transition-colors hover:bg-muted focus:bg-muted"
                        >
                          <span className="font-medium leading-tight">{product.name}</span>
                          <span className="shrink-0 text-xs font-semibold text-copper">{formatPrice(product.price)}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </div>

                {/* Reports & packs */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-copper">Reports &amp; packs</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Registry intelligence &amp; bundles</p>
                  <div className="mt-3 grid gap-0.5">
                    {PRODUCTS.filter((p) => p.category === "report" || p.category === "pack").map((product) => (
                      <DropdownMenuItem key={product.slug} asChild className="p-0">
                        <Link
                          to="/report/$type"
                          params={{ type: product.slug }}
                          className="flex items-start justify-between gap-3 rounded-md px-2 py-2 text-sm outline-none transition-colors hover:bg-muted focus:bg-muted"
                        >
                          <span className="font-medium leading-tight">{product.name}</span>
                          <span className="shrink-0 text-xs font-semibold text-copper">{formatPrice(product.price)}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-3">
                <DropdownMenuItem asChild className="p-0">
                  <Link
                    to="/pricing"
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus:bg-muted"
                  >
                    <span>View all products</span>
                    <ArrowRight className="size-4 text-copper" />
                  </Link>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/pricing" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            Pricing
          </Link>
          <Link to="/about" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            About
          </Link>
          <Link to="/contact" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            Contact
          </Link>
        </nav>

        <form onSubmit={submit} className="relative ml-auto hidden max-w-xs flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            type="search"
            aria-label="Search Cyprus companies"
            placeholder="Search companies…"
            className="h-9 w-full rounded-full border border-input bg-muted/60 pl-9 pr-3 text-sm outline-none transition-colors focus:border-ring focus:bg-background"
          />
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link
            to="/cart"
            className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Cart"
          >
            <ShoppingCart className="size-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-copper text-[10px] font-bold text-copper-foreground">
                {count}
              </span>
            )}
          </Link>
          {account.ready && account.signedIn ? (
            <>
              <Link to="/account/orders" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">
                My orders
              </Link>
              <SignOutButton className='hidden sm:inline-flex' />
              {account.isAdmin && (
                <Link
                  to="/admin/orders"
                  className="hidden items-center gap-1 rounded-md border border-copper/40 px-2.5 py-1 text-xs font-semibold text-copper hover:bg-copper/10 sm:inline-flex"
                >
                  <ShieldCheck className="size-3.5" /> Admin
                </Link>
              )}
            </>
          ) : (
            <Link to="/auth" search={{ redirect: signInRedirect }} className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">
              Sign in
            </Link>
          )}
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/search" search={{ q: "", page: 1 }}>
              Order a certificate
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-background px-4 py-4 lg:hidden">
          <form onSubmit={submit} className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              type="search"
              placeholder="Search companies…"
              className="h-10 w-full rounded-full border border-input bg-muted/60 pl-9 pr-3 text-sm outline-none focus:border-ring focus:bg-background"
            />
          </form>
          <div className="grid gap-1 text-sm">
            <p className="px-3 pt-1 text-xs font-semibold uppercase tracking-wider text-copper">Certificates</p>
            {PRODUCTS.filter((p) => p.category === "certificate").map((product) => (
              <Link
                key={product.slug}
                to="/report/$type"
                params={{ type: product.slug }}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-md px-3 py-2 pl-6 hover:bg-muted"
              >
                <span>{product.name}</span>
                <span className="shrink-0 text-xs font-semibold text-copper">{formatPrice(product.price)}</span>
              </Link>
            ))}
            <p className="px-3 pt-3 text-xs font-semibold uppercase tracking-wider text-copper">Reports &amp; packs</p>
            {PRODUCTS.filter((p) => p.category === "report" || p.category === "pack").map((product) => (
              <Link
                key={product.slug}
                to="/report/$type"
                params={{ type: product.slug }}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-md px-3 py-2 pl-6 hover:bg-muted"
              >
                <span>{product.name}</span>
                <span className="shrink-0 text-xs font-semibold text-copper">{formatPrice(product.price)}</span>
              </Link>
            ))}
            <div className="my-1 border-t" />

            <Link to="/pricing" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-muted">
              Pricing
            </Link>
            <Link to="/about" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-muted">
              About
            </Link>
            <Link to="/contact" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-muted">
              Contact
            </Link>
            {account.ready && account.signedIn ? (
              <>
                <Link to="/account/orders" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-muted">
                  My orders
                </Link>
                <SignOutButton className='justify-start px-3 py-2 h-auto w-full text-foreground hover:bg-muted' />
                {account.isAdmin && (
                  <Link to="/admin/orders" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 font-semibold text-copper hover:bg-muted">
                    Admin dashboard
                  </Link>
                )}
              </>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 hover:bg-muted">
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
