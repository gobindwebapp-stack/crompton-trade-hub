import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BadgePercent, Boxes, ShieldCheck, Truck } from "lucide-react";
import { homeQuery } from "@/lib/catalog.queries";
import { BannerCarousel, SchemeStrip, SectionTitle, SponsoredAd } from "@/components/store/Marketing";
import { ProductGrid, ProductImage } from "@/components/store/ProductCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Crompton Trade Hub — Wholesale fans, lighting & pumps" },
      {
        name: "description",
        content: "Shop Crompton fans, LED lighting, pumps and appliances at dealer prices. Browse freely, order in bulk with MOQ pricing.",
      },
      { property: "og:title", content: "Crompton Trade Hub — Wholesale electricals" },
      { property: "og:description", content: "Dealer prices, MOQ ordering and live schemes on fans, lighting and pumps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: Home,
});

const PERKS = [
  { icon: BadgePercent, title: "Dealer pricing", text: "Up to 35% below retail" },
  { icon: Boxes, title: "Bulk MOQ orders", text: "Carton-level quantities" },
  { icon: Truck, title: "Pan-India freight", text: "Free above ₹1 lakh" },
  { icon: ShieldCheck, title: "Genuine stock", text: "Direct from warehouse" },
];

function Home() {
  const { data } = useSuspenseQuery(homeQuery);
  const [firstAd, secondAd] = data.ads;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-3 py-4 sm:px-4">
      <BannerCarousel banners={data.banners} />

      <SchemeStrip schemes={data.schemes} />

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PERKS.map((p) => (
          <div key={p.title} className="flex items-center gap-2.5 rounded-lg border bg-card p-3 shadow-card">
            <p.icon className="h-6 w-6 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight">{p.title}</p>
              <p className="text-[11px] text-muted-foreground">{p.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section>
        <SectionTitle title="Shop by category" action={{ label: "See all" }} />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {data.categories.map((c) => (
            <Link
              key={c.id}
              to="/products"
              search={{ category: c.slug }}
              className="group flex flex-col items-center gap-1.5 rounded-lg border bg-card p-2 text-center shadow-card hover:border-primary"
            >
              <span className="aspect-square w-full overflow-hidden rounded-md bg-surface">
                <ProductImage src={c.image_url} alt="" className="h-full w-full object-contain p-2 transition-transform group-hover:scale-110" />
              </span>
              <span className="text-[11px] font-semibold leading-tight sm:text-xs">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {firstAd && <SponsoredAd ad={firstAd} />}

      {data.featured.length > 0 && (
        <section>
          <SectionTitle title="Bestsellers for dealers" action={{ label: "View all" }} />
          <ProductGrid products={data.featured} />
        </section>
      )}

      {secondAd && <SponsoredAd ad={secondAd} />}

      <section>
        <SectionTitle title="Full catalog" action={{ label: "Browse & filter" }} />
        <ProductGrid products={data.latest} />
      </section>
    </div>
  );
}
