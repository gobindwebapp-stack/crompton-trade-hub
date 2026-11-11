import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, Trash2, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/store/ProductCard";
import { MoqBadge } from "@/components/store/PriceBlock";
import { useAuth } from "@/lib/auth";
import { settingsQuery } from "@/lib/catalog.queries";
import { estimateTotals, formatINR, lineProblem, unitPrice } from "@/lib/pricing";
import { useCartProducts } from "@/lib/useCartProducts";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Crompton Trade Hub" },
      { name: "description", content: "Review quantities and minimum order requirements before checkout." },
      { property: "og:title", content: "Cart — Crompton Trade Hub" },
      { property: "og:description", content: "Review your wholesale order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const { data: settings } = useQuery(settingsQuery);
  const { cart, items, missing, isLoading } = useCartProducts();

  useEffect(() => {
    missing.forEach((m) => cart.remove(m.productId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing.length]);

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-extrabold">Your cart is empty</h1>
        <p className="text-sm text-muted-foreground">Browse the catalog and add products in bulk.</p>
        <Button variant="cta" asChild><Link to="/products">Start shopping</Link></Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    );
  }

  const gst = Number(settings?.gst_percent ?? 18);
  const totals = estimateTotals(items.map((i) => ({ unit: unitPrice(i.product, role), qty: i.line.quantity })), gst);
  const problems = items.filter((i) => lineProblem(i.product, i.line.quantity, role));

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[1fr_340px]">
      <section className="space-y-3">
        <h1 className="text-xl font-extrabold">Cart ({items.length} {items.length === 1 ? "item" : "items"})</h1>
        {!user && (
          <p className="rounded-md bg-secondary px-3 py-2 text-xs text-secondary-foreground">
            Showing retail prices. <Link to="/auth" search={{ redirect: "/cart" }} className="font-bold underline">Sign in</Link> as a dealer to see wholesale prices.
          </p>
        )}
        {items.map(({ line, product }) => {
          const problem = lineProblem(product, line.quantity, role);
          const unit = unitPrice(product, role);
          return (
            <article key={line.productId} className="flex gap-3 rounded-lg border bg-card p-3 shadow-card">
              <Link to="/product/$slug" params={{ slug: product.slug }} className="h-20 w-20 shrink-0 rounded-md bg-surface">
                <ProductImage src={product.image_url} alt={product.name} className="h-full w-full object-contain p-1" />
              </Link>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <Link to="/product/$slug" params={{ slug: product.slug }} className="line-clamp-2 text-sm font-semibold hover:text-primary">
                    {product.name}
                  </Link>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => cart.remove(line.productId)} aria-label="Remove">
                    <Trash2 />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatINR(unit)} / {product.unit}</span>
                  <MoqBadge product={product} role={role} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center rounded-md border">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cart.setQty(line.productId, line.quantity - 1)} aria-label="Decrease">
                      <Minus />
                    </Button>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={line.quantity}
                      onChange={(e) => cart.setQty(line.productId, Number(e.target.value))}
                      className="w-14 bg-transparent text-center text-sm font-bold outline-none"
                      aria-label="Quantity"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cart.setQty(line.productId, line.quantity + 1)} aria-label="Increase">
                      <Plus />
                    </Button>
                  </div>
                  <p className="font-bold">{formatINR(unit * line.quantity)}</p>
                </div>
                {problem && <p className="text-xs font-semibold text-destructive">{problem}</p>}
              </div>
            </article>
          );
        })}
      </section>

      <aside className="h-fit space-y-3 rounded-lg border bg-card p-4 shadow-card lg:sticky lg:top-36">
        <h2 className="font-display text-base font-bold">Order summary</h2>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatINR(totals.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">GST ({gst}%)</dt><dd>{formatINR(totals.gst)}</dd></div>
          <div className="flex justify-between border-t pt-2 text-base font-extrabold"><dt>Estimated total</dt><dd>{formatINR(totals.total)}</dd></div>
        </dl>
        {problems.length > 0 && (
          <p className="text-xs font-semibold text-destructive">Fix {problems.length} item{problems.length > 1 ? "s" : ""} above to continue.</p>
        )}
        <Button variant="cta" size="lg" className="w-full" disabled={problems.length > 0} onClick={() => navigate({ to: "/checkout" })}>
          {!user && <Lock />} {user ? "Proceed to checkout" : "Sign up to checkout"}
        </Button>
        <p className="text-[11px] text-muted-foreground">Final prices are confirmed on our server when you place the order.</p>
      </aside>
    </div>
  );
}
