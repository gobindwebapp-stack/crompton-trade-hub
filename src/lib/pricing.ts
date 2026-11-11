// Pure pricing rules shared by the storefront. The server (place_b2b_order) re-applies
// these same rules and is the source of truth; this is for display and early feedback.
export type AppRole = "admin" | "dealer" | "retailer";

export type PricedProduct = {
  retail_price: number | string;
  wholesale_price: number | string;
  dealer_moq: number;
  retailer_moq: number;
  stock: number;
};

export function isWholesaleBuyer(role: AppRole | null | undefined): boolean {
  return role === "dealer" || role === "admin";
}

export function unitPrice(p: PricedProduct, role: AppRole | null | undefined): number {
  return Number(isWholesaleBuyer(role) ? p.wholesale_price : p.retail_price);
}

export function minOrderQty(p: PricedProduct, role: AppRole | null | undefined): number {
  return isWholesaleBuyer(role) ? p.dealer_moq : p.retailer_moq;
}

export function savingsPercent(p: PricedProduct): number {
  const r = Number(p.retail_price);
  const w = Number(p.wholesale_price);
  if (!r || w >= r) return 0;
  return Math.round(((r - w) / r) * 100);
}

/** Returns a human message when a cart line breaks a rule, otherwise null. */
export function lineProblem(
  p: PricedProduct & { name: string },
  qty: number,
  role: AppRole | null | undefined,
): string | null {
  if (!Number.isInteger(qty) || qty <= 0) return "Enter a valid quantity";
  if (p.stock <= 0) return "Out of stock";
  const moq = minOrderQty(p, role);
  if (qty < moq) return `Minimum order is ${moq} units`;
  if (qty > p.stock) return `Only ${p.stock} units in stock`;
  return null;
}

export function estimateTotals(
  lines: { unit: number; qty: number }[],
  gstPercent: number,
): { subtotal: number; gst: number; total: number } {
  const subtotal = round2(lines.reduce((s, l) => s + l.unit * l.qty, 0));
  const gst = round2((subtotal * gstPercent) / 100);
  return { subtotal, gst, total: round2(subtotal + gst) };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});
export function formatINR(n: number | string): string {
  return inr.format(Number(n));
}
