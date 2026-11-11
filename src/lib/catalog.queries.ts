import { queryOptions } from "@tanstack/react-query";
import { getHomeData, getProduct, listProducts, getStoreSettings, getCategories } from "./catalog.functions";

export const homeQuery = queryOptions({
  queryKey: ["home"],
  queryFn: () => getHomeData(),
  staleTime: 60_000,
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: () => getCategories(),
  staleTime: 5 * 60_000,
});

export const productsQuery = (q?: string, category?: string) =>
  queryOptions({
    queryKey: ["products", q ?? "", category ?? ""],
    queryFn: () => listProducts({ data: { q, category } }),
    staleTime: 30_000,
  });

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProduct({ data: { slug } }),
    staleTime: 30_000,
  });

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: () => getStoreSettings(),
  staleTime: 60_000,
});
