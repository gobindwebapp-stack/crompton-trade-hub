import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Minus, Plus, ShoppingCart, PackageCheck, PackageX } from "lucide-react";
import { toast } from "sonner";
import { productQuery } from "@/lib/catalog.queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoqBadge, PriceBlock } from "@/components/store/PriceBlock";
import { ProductGrid, ProductImage } from "@/components/store/ProductCard";
import { SponsoredAd } from "@/components/store/Marketing";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { formatINR, isWholesaleBuyer, lineProblem, minOrderQty } from "@/lib/pricing";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!data) throw notFound();
    return { name: data.product.name, description: data.product.description };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Product"} — Crompton Trade Hub` },
      { name: "description", content: loaderData?.description || "Wholesale and retail pricing with MOQ." },
      { property: "og:title", content: loaderData?.name ?? "Product" },
      { property: "og:description", content: loaderData?.description || "Wholesale and retail pricing with MOQ." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(slug));
  const { role } = useAuth();
  const cart = useCart();
  const product = data!.product;
  const moq = minOrderQty(product, role);
  const [qty, setQty] = useState<number | null>(null);
  const quantity = qty ?? moq;
  const problem = lineProblem(product, quantity, role);
  const specs = Object.entries(product.specs ?? {});
  const unit = isWholesaleBuyer(role) ? product.wholesale_price : product.retail_price;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-3 py-4 sm:px-4">
      <nav className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> /{" "}
        {product.categories && (
          <>
            <Link to="/products" search={{ category: product.categories.slug }} className="hover:text-primary">
              {product.categories.name}
            </Link>{" "}
            /{" "}
          </>
        )}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl border bg-card">
          <ProductImage src={product.image_url} alt={product.name} className="h-full w-full object-contain p-6" />
          <div className="absolute left-3 top-3">
            <MoqBadge product={product} role={role} />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {product.brand} · SKU {product.sku}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">{product.name}</h1>
          </div>

          <PriceBlock product={product} role={role} size="lg" />

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Retailer</p>
              <p className="font-bold">{formatINR(product.retail_price)}</p>
              <p className="text-xs text-muted-foreground">Min {product.retailer_moq} {product.unit}</p>
            </div>
            <div className="rounded-lg border border-wholesale/30 bg-wholesale-soft p-3">
              <p className="text-xs text-wholesale">Dealer</p>
              <p className="font-bold text-wholesale">{formatINR(product.wholesale_price)}</p>
              <p className="text-xs text-wholesale">MOQ {product.dealer_moq} {product.unit}</p>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-sm">
            {product.stock > 0 ? (
              <><PackageCheck className="h-4 w-4 text-wholesale" /> <span className="font-semibold text-wholesale">In stock</span> · {product.stock} {product.unit} available</>
            ) : (
              <><PackageX className="h-4 w-4 text-destructive" /> <span className="font-semibold text-destructive">Out of stock</span></>
            )}
          </p>

          {product.stock > 0 && (
            <div className="space-y-2 rounded-lg border bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-md border">
                  <Button variant="ghost" size="icon" onClick={() => setQty(Math.max(1, quantity - 1))} aria-label="Decrease">
                    <Minus />
                  </Button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
                    className="w-16 bg-transparent text-center text-sm font-bold outline-none"
                    aria-label="Quantity"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setQty(quantity + 1)} aria-label="Increase">
                    <Plus />
                  </Button>
                </div>
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Line total</p>
                  <p className="font-bold">{formatINR(unit * quantity)}</p>
                </div>
              </div>
              {problem && <p className="text-xs font-semibold text-destructive">{problem}</p>}
              <Button
                variant="cta"
                size="lg"
                className="w-full"
                disabled={!!problem}
                onClick={() => {
                  cart.add(product.id, quantity);
                  toast.success(`Added ${quantity} × ${product.name}`);
                }}
              >
                <ShoppingCart /> Add to cart
              </Button>
            </div>
          )}

          {product.description && <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>}

          {specs.length > 0 && (
            <div className="overflow-hidden rounded-lg border bg-card">
              <p className="border-b bg-surface px-3 py-2 text-sm font-bold">Specifications</p>
              <dl className="divide-y text-sm">
                {specs.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-2 gap-2 px-3 py-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {role === null && (
            <p className="text-xs text-muted-foreground">
              <Badge variant="wholesale" className="mr-1">Tip</Badge>
              <Link to="/auth" search={{ mode: "signup" }} className="font-semibold text-primary">Register as a dealer</Link> to buy at dealer prices.
            </p>
          )}
        </div>
      </div>

      {data!.ad && <SponsoredAd ad={data!.ad} />}

      {data!.related.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-extrabold">More in {product.categories?.name ?? "this category"}</h2>
          <ProductGrid products={data!.related} />
        </section>
      )}
    </div>
  );
}
