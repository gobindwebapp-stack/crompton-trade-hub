import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SearchX } from "lucide-react";
import { z } from "zod";
import { categoriesQuery, productsQuery } from "@/lib/catalog.queries";
import { ProductGrid } from "@/components/store/ProductCard";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().max(80).optional().catch(undefined),
  category: z.string().max(80).optional().catch(undefined),
});

export const Route = createFileRoute("/products")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ q: search.q, category: search.category }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(productsQuery(deps.q, deps.category)),
      context.queryClient.ensureQueryData(categoriesQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "All products — Crompton Trade Hub" },
      { name: "description", content: "Browse fans, LED lighting, pumps, water heaters and appliances with dealer and retail pricing." },
      { property: "og:title", content: "Products — Crompton Trade Hub" },
      { property: "og:description", content: "Wholesale electricals catalog with MOQ pricing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { q, category } = Route.useSearch();
  const { data: products } = useSuspenseQuery(productsQuery(q, category));
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const current = categories.find((c) => c.slug === category);

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4">
      <div className="mb-3">
        <h1 className="text-xl font-extrabold sm:text-2xl">
          {q ? `Results for “${q}”` : current ? current.name : "All products"}
        </h1>
        <p className="text-sm text-muted-foreground">{products.length} products</p>
      </div>

      <div className="scrollbar-none -mx-3 mb-4 flex gap-2 overflow-x-auto px-3">
        <Chip active={!category} to={{ q }}>All</Chip>
        {categories.map((c) => (
          <Chip key={c.id} active={c.slug === category} to={{ q, category: c.slug }}>
            {c.name}
          </Chip>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-card py-16 text-center">
          <SearchX className="h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">No products found</p>
          <Link to="/products" className="text-sm font-semibold text-primary">Clear filters</Link>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}

function Chip({ active, to, children }: { active: boolean; to: { q?: string; category?: string }; children: React.ReactNode }) {
  return (
    <Link
      to="/products"
      search={to}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:border-primary",
      )}
    >
      {children}
    </Link>
  );
}
