import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export const PRODUCT_COLUMNS =
  "id, sku, name, slug, description, brand, category_id, image_url, retail_price, wholesale_price, dealer_moq, retailer_moq, stock, unit, specs, is_featured, categories(name, slug)";

export type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  category_id: string | null;
  image_url: string | null;
  retail_price: number;
  wholesale_price: number;
  dealer_moq: number;
  retailer_moq: number;
  stock: number;
  unit: string;
  specs: Record<string, string>;
  is_featured: boolean;
  categories: { name: string; slug: string } | null;
};

const getPublicClient = createServerOnlyFn(() => {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
});

function asProducts(rows: unknown): CatalogProduct[] {
  return ((rows as CatalogProduct[] | null) ?? []).map((p) => ({
    ...p,
    retail_price: Number(p.retail_price),
    wholesale_price: Number(p.wholesale_price),
    specs: (p.specs && typeof p.specs === "object" ? p.specs : {}) as Record<string, string>,
  }));
}

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const sb = getPublicClient();
  const [banners, ads, categories, featured, latest] = await Promise.all([
    sb.from("banners").select("*").eq("is_active", true).order("sort_order"),
    sb.from("sponsored_ads").select("*").eq("is_active", true).order("sort_order"),
    sb.from("categories").select("*").order("sort_order"),
    sb.from("products").select(PRODUCT_COLUMNS).eq("is_active", true).eq("is_featured", true).limit(10),
    sb.from("products").select(PRODUCT_COLUMNS).eq("is_active", true).order("created_at", { ascending: false }).limit(24),
  ]);
  return {
    banners: (banners.data ?? []).filter((b) => b.kind === "banner"),
    schemes: (banners.data ?? []).filter((b) => b.kind === "scheme"),
    ads: ads.data ?? [],
    categories: categories.data ?? [],
    featured: asProducts(featured.data),
    latest: asProducts(latest.data),
  };
});

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await getPublicClient().from("categories").select("*").order("sort_order");
  return data ?? [];
});

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((input: { q?: string; category?: string }) =>
    z
      .object({ q: z.string().max(80).optional(), category: z.string().max(80).optional() })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const sb = getPublicClient();
    let query = sb.from("products").select(PRODUCT_COLUMNS).eq("is_active", true);
    if (data.category) {
      const { data: cat } = await sb.from("categories").select("id").eq("slug", data.category).maybeSingle();
      if (!cat) return [];
      query = query.eq("category_id", cat.id);
    }
    const term = (data.q ?? "").replace(/[^\p{L}\p{N} .\-]/gu, " ").trim();
    if (term) {
      query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,description.ilike.%${term}%`);
    }
    const { data: rows } = await query.order("is_featured", { ascending: false }).order("name").limit(120);
    return asProducts(rows);
  });

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1).max(160) }).parse(input))
  .handler(async ({ data }) => {
    const sb = getPublicClient();
    const { data: row } = await sb
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!row) return null;
    const product = asProducts([row])[0];
    let related: CatalogProduct[] = [];
    if (product.category_id) {
      const { data: rel } = await sb
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("is_active", true)
        .eq("category_id", product.category_id)
        .neq("id", product.id)
        .limit(8);
      related = asProducts(rel);
    }
    const { data: ads } = await sb.from("sponsored_ads").select("*").eq("is_active", true).order("sort_order").limit(1);
    return { product, related, ad: ads?.[0] ?? null };
  });

export const getProductsByIds = createServerFn({ method: "POST" })
  .inputValidator((input: { ids: string[] }) =>
    z.object({ ids: z.array(z.string().uuid()).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.ids.length === 0) return [];
    const { data: rows } = await getPublicClient()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .in("id", data.ids)
      .eq("is_active", true);
    return asProducts(rows);
  });

export const getStoreSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await getPublicClient().from("app_settings").select("*").eq("id", 1).maybeSingle();
  return data;
});

export const getAssistantCatalog = createServerOnlyFn(async () => {
  const { data } = await getPublicClient()
    .from("products")
    .select("name, slug, sku, retail_price, wholesale_price, dealer_moq, retailer_moq, stock, unit, categories(name)")
    .eq("is_active", true)
    .limit(200);
  return data ?? [];
});

export const getAssistantEnabled = createServerOnlyFn(async () => {
  const { data } = await getPublicClient().from("app_settings").select("assistant_enabled").eq("id", 1).maybeSingle();
  return data?.assistant_enabled ?? false;
});
