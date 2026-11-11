import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = { productId: string; quantity: number };

type CartState = {
  lines: CartLine[];
  count: number;
  add: (productId: string, quantity: number) => void;
  setQty: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const KEY = "cth-cart-v1";
const CartContext = createContext<CartState | null>(null);

function parse(raw: string | null): CartLine[] {
  try {
    const val = JSON.parse(raw ?? "[]");
    if (!Array.isArray(val)) return [];
    return val
      .filter((l) => typeof l?.productId === "string" && Number.isInteger(l?.quantity) && l.quantity > 0)
      .slice(0, 200);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLines(parse(window.localStorage.getItem(KEY)));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, loaded]);

  const add = useCallback((productId: string, quantity: number) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [...prev, { productId, quantity }];
    });
  }, []);

  const setQty = useCallback((productId: string, quantity: number) => {
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.max(1, Math.floor(quantity) || 1) } : l)),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, count: lines.reduce((s, l) => s + l.quantity, 0), add, setQty, remove, clear }),
    [lines, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
