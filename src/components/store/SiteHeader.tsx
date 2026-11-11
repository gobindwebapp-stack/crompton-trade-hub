import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingCart, User, LogOut, Package, LayoutDashboard, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { categoriesQuery } from "@/lib/catalog.queries";

const ROLE_LABEL = { admin: "Admin", dealer: "Dealer", retailer: "Retailer" } as const;

export function SiteHeader() {
  const navigate = useNavigate();
  const { user, role, profile, signOut } = useAuth();
  const { count } = useCart();
  const search = useRouterState({ select: (s) => s.location.search as { q?: string } });
  const [q, setQ] = useState(search.q ?? "");
  const { data: categories = [] } = useQuery(categoriesQuery);

  return (
    <header className="sticky top-0 z-40 bg-header text-header-foreground shadow-float">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 pt-2.5 pb-2 md:gap-6 md:py-3">
        <Link to="/" className="flex shrink-0 items-center gap-1.5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-cta text-cta-foreground">
            <Zap className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="leading-none">
            <span className="block font-display text-base font-extrabold tracking-tight">Crompton</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-header-muted">Trade Hub</span>
          </span>
        </Link>

        <form
          className="hidden flex-1 md:block"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/products", search: { q: q.trim() || undefined } });
          }}
        >
          <SearchBox value={q} onChange={setQ} />
        </form>

        <div className="ml-auto flex items-center gap-1">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="header" size="sm" className="h-10 gap-1.5 px-2">
                  <User />
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block text-[10px] text-header-muted">{role ? ROLE_LABEL[role] : "Account"}</span>
                    <span className="block max-w-28 truncate text-xs font-bold">
                      {profile?.full_name || user.email}
                    </span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {user.email}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {role ? `${ROLE_LABEL[role]} account` : ""}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/orders">
                    <Package /> My orders
                  </Link>
                </DropdownMenuItem>
                {role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <LayoutDashboard /> Admin dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="header" size="sm" className="h-10 px-2" asChild>
              <Link to="/auth">
                <User />
                <span className="text-xs font-bold">Sign in</span>
              </Link>
            </Button>
          )}
          <Button variant="header" size="sm" className="relative h-10 px-2" asChild>
            <Link to="/cart" aria-label={`Cart, ${count} items`}>
              <ShoppingCart className="!size-5" />
              <span className="hidden text-xs font-bold sm:inline">Cart</span>
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-cta px-1 text-[10px] font-extrabold text-cta-foreground">
                  {count > 999 ? "999+" : count}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>

      <form
        className="px-3 pb-2.5 md:hidden"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/products", search: { q: q.trim() || undefined } });
        }}
      >
        <SearchBox value={q} onChange={setQ} />
      </form>

      <nav className="border-t border-header-foreground/10 bg-header-foreground/5">
        <div className="scrollbar-none mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 py-1.5 text-xs font-semibold">
          <Link
            to="/products"
            className="shrink-0 rounded px-2.5 py-1 text-header-foreground/90 hover:bg-header-foreground/10"
          >
            All products
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/products"
              search={{ category: c.slug }}
              className="shrink-0 rounded px-2.5 py-1 text-header-foreground/90 hover:bg-header-foreground/10"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex h-10 overflow-hidden rounded-md bg-card ring-2 ring-transparent focus-within:ring-cta">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 80))}
        placeholder="Search fans, LED bulbs, pumps, SKU…"
        className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        aria-label="Search products"
      />
      <button type="submit" className="grid w-12 place-items-center bg-cta text-cta-foreground" aria-label="Search">
        <Search className="h-5 w-5" />
      </button>
    </div>
  );
}
