import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ExternalLink, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Banner = Tables<"banners">;
type Ad = Tables<"sponsored_ads">;

function isInternal(url: string) {
  return url.startsWith("/") && !url.startsWith("//");
}

function SmartLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  if (!href) return <div className={className}>{children}</div>;
  if (isInternal(href)) return <a href={href} className={className}>{children}</a>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer sponsored" className={className}>
      {children}
    </a>
  );
}

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % banners.length), 6000);
    return () => clearInterval(t);
  }, [banners.length]);
  if (banners.length === 0) return null;

  return (
    <section className="relative overflow-hidden rounded-xl bg-header" aria-roledescription="carousel">
      <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${i * 100}%)` }}>
        {banners.map((b, idx) => (
          <SmartLink key={b.id} href={b.link_url} className="relative block w-full shrink-0">
            {b.image_url && (
              <img
                src={b.image_url}
                alt=""
                className="h-48 w-full object-cover sm:h-64 md:h-80"
                loading={idx === 0 ? "eager" : "lazy"}
                width={1600}
                height={800}
              />
            )}
            <div className="absolute inset-0 bg-hero-fade" />
            <div className="absolute inset-0 flex flex-col justify-center gap-2 p-5 text-header-foreground sm:p-10 md:max-w-xl">
              {b.badge_text && <Badge variant="cta" className="w-fit">{b.badge_text}</Badge>}
              <h2 className="text-2xl font-extrabold leading-tight sm:text-4xl">{b.title}</h2>
              {b.subtitle && <p className="max-w-sm text-sm text-header-muted sm:text-base">{b.subtitle}</p>}
              <span className="mt-1 w-fit rounded-md bg-cta px-3 py-1.5 text-sm font-bold text-cta-foreground">Shop now</span>
            </div>
          </SmartLink>
        ))}
      </div>
      {banners.length > 1 && (
        <>
          <Button
            variant="header"
            size="icon"
            className="absolute left-1 top-1/2 hidden -translate-y-1/2 sm:inline-flex"
            onClick={() => setI((v) => (v - 1 + banners.length) % banners.length)}
            aria-label="Previous banner"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="header"
            size="icon"
            className="absolute right-1 top-1/2 hidden -translate-y-1/2 sm:inline-flex"
            onClick={() => setI((v) => (v + 1) % banners.length)}
            aria-label="Next banner"
          >
            <ChevronRight />
          </Button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => setI(idx)}
                aria-label={`Show banner ${idx + 1}`}
                className={cn("h-1.5 rounded-full bg-header-foreground/50 transition-all", idx === i ? "w-6 bg-cta" : "w-1.5")}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function SchemeStrip({ schemes }: { schemes: Banner[] }) {
  if (schemes.length === 0) return null;
  return (
    <section>
      <div className="scrollbar-none -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-1">
        {schemes.map((s) => (
          <SmartLink
            key={s.id}
            href={s.link_url}
            className="flex w-64 shrink-0 snap-start items-start gap-3 rounded-lg bg-scheme p-3.5 text-primary-foreground shadow-card sm:w-72"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cta text-cta-foreground">
              <Tag className="h-4 w-4" />
            </span>
            <span>
              {s.badge_text && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-cta">{s.badge_text}</span>
              )}
              <span className="block font-display text-sm font-bold leading-snug">{s.title}</span>
              {s.subtitle && <span className="mt-0.5 block text-xs opacity-80">{s.subtitle}</span>}
            </span>
          </SmartLink>
        ))}
      </div>
    </section>
  );
}

export function SponsoredAd({ ad, className }: { ad: Ad; className?: string }) {
  return (
    <a
      href={ad.link_url || "#"}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={cn("flex items-center gap-4 rounded-lg border border-dashed bg-sponsored p-4 shadow-card", className)}
    >
      {ad.image_url && (
        <img src={ad.image_url} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" loading="lazy" width={64} height={64} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="sponsored">Sponsored</Badge>
          <span className="truncate text-xs font-semibold text-sponsored-foreground">{ad.sponsor_name}</span>
        </div>
        <p className="mt-1 font-display text-sm font-bold text-foreground">{ad.headline}</p>
        {ad.body && <p className="line-clamp-2 text-xs text-muted-foreground">{ad.body}</p>}
      </div>
      <span className="hidden shrink-0 items-center gap-1 rounded-md bg-card px-3 py-1.5 text-xs font-bold text-sponsored-foreground sm:inline-flex">
        {ad.cta_label} <ExternalLink className="h-3 w-3" />
      </span>
    </a>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: { label: string; to: string; search?: Record<string, string> } }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-2">
      <h2 className="text-lg font-extrabold sm:text-xl">{title}</h2>
      {action && (
        <Link to={action.to} search={action.search} className="text-sm font-semibold text-primary hover:underline">
          {action.label}
        </Link>
      )}
    </div>
  );
}
