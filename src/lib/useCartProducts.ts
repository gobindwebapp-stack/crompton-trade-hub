import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProductsByIds } from "./catalog.functions";
import { useCart } from "./cart";

/** Loads fresh product data (price, MOQ, stock) for every line in the cart. */
export function useCartProducts() {
  const cart = useCart();
  const fetchProducts = useServerFn(getProductsByIds);
  const ids = cart.lines.map((l) => l.productId).sort();
  const query = useQuery({
    queryKey: ["cart-products", ids],
    queryFn: () => fetchProducts({ data: { ids } }),
    enabled: ids.length > 0,
  });
  const byId = new Map((query.data ?? []).map((p) => [p.id, p]));
  const items = cart.lines
    .map((l) => ({ line: l, product: byId.get(l.productId) }))
    .filter((x) => x.product !== undefined) as {
    line: { productId: string; quantity: number };
    product: NonNullable<ReturnType<typeof byId.get>>;
  }[];
  const missing = query.isSuccess ? cart.lines.filter((l) => !byId.has(l.productId)) : [];
  return { cart, items, missing, isLoading: query.isLoading && ids.length > 0 };
}
