import { Link } from "@tanstack/react-router";
import { ShoppingCart, PackageX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CatalogProduct } from "@/lib/catalog.functions";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { minOrderQty } from "@/lib/pricing";
import { MoqBadge, PriceBlock } from "./PriceBlock";

export function ProductImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  return (
    <img
      src={src || "/images/products/ceiling-fan.webp"}
      alt={alt}
      loading="lazy"
      decoding="async"
      width={600}
      height={600}
      className={className}
    />
  );
}

export function ProductCard({ product }: { product: CatalogProduct }) {
  const { role } = useAuth();
  const cart = useCart();
  const outOfStock = product.stock <= 0;
  const moq = minOrderQty(product, role);

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-card transition-shadow hover:shadow-float">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="relative block aspect-square bg-surface">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <MoqBadge product={product} role={role} />
          {product.is_featured && <Badge variant="cta">Bestseller</Badge>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {product.brand} · {product.sku}
          </p>
          <Link to="/product/$slug" params={{ slug: product.slug }}>
            <h3 className="line-clamp-2 font-sans text-sm font-semibold leading-snug text-foreground hover:text-primary">
              {product.name}
            </h3>
          </Link>
        </div>
        <PriceBlock product={product} role={role} />
        <div className="mt-auto pt-1">
          {outOfStock ? (
            <Button variant="secondary" className="w-full" disabled>
              <PackageX /> Out of stock
            </Button>
          ) : (
            <Button
              variant="cta"
              className="w-full"
              onClick={() => {
                cart.add(product.id, moq);
                toast.success(`Added ${moq} × ${product.name}`);
              }}
            >
              <ShoppingCart /> Add {moq > 1 ? `${moq} units` : "to cart"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
