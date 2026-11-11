import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Banknote, CreditCard, Landmark, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { settingsQuery } from "@/lib/catalog.queries";
import { estimateTotals, formatINR, lineProblem, unitPrice } from "@/lib/pricing";
import { cleanMultiline, cleanText } from "@/lib/sanitize";
import { useCartProducts } from "@/lib/useCartProducts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Crompton Trade Hub" },
      { name: "description", content: "Confirm delivery details and payment for your wholesale order." },
      { property: "og:title", content: "Checkout — Crompton Trade Hub" },
      { property: "og:description", content: "Secure B2B checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

const shippingSchema = z.object({
  name: z.string().min(2, "Enter a contact name").max(120),
  phone: z.string().regex(/^[0-9+ -]{7,20}$/, "Enter a valid phone number"),
  address: z.string().min(5, "Enter the full delivery address").max(500),
  city: z.string().min(2, "Enter a city").max(80),
  pincode: z.string().regex(/^[0-9]{6}$/, "PIN code must be 6 digits"),
  gstin: z.string().regex(/^([0-9A-Z]{15})?$/, "GSTIN must be 15 letters/digits"),
  notes: z.string().max(1000),
});

type PayMethod = "cod" | "bank_transfer" | "online";

function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role, profile } = useAuth();
  const { data: settings } = useQuery(settingsQuery);
  const { cart, items, isLoading } = useCartProducts();
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", pincode: "", gstin: "", notes: "" });

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        name: f.name || profile.full_name,
        phone: f.phone || profile.phone,
        city: f.city || profile.city,
        gstin: f.gstin || profile.gstin,
      }));
    }
  }, [profile]);

  const methods: { id: PayMethod; label: string; text: string; icon: typeof Banknote; on: boolean }[] = [
    { id: "cod", label: "Cash on delivery", text: "Pay when goods arrive", icon: Banknote, on: !!settings?.cod_enabled },
    { id: "bank_transfer", label: "Bank transfer / NEFT", text: "We'll share bank details", icon: Landmark, on: !!settings?.bank_transfer_enabled },
    { id: "online", label: settings?.gateway_label || "Online payment", text: "Pay securely online", icon: CreditCard, on: !!settings?.online_gateway_enabled },
  ];
  const available = methods.filter((m) => m.on);
  const selected = method && available.some((m) => m.id === method) ? method : available[0]?.id ?? null;

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-extrabold">Nothing to check out</h1>
        <Button variant="cta" className="mt-4" asChild><Link to="/products">Browse products</Link></Button>
      </div>
    );
  }
  if (isLoading || !settings) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const gst = Number(settings.gst_percent);
  const totals = estimateTotals(items.map((i) => ({ unit: unitPrice(i.product, role), qty: i.line.quantity })), gst);
  const problems = items.map((i) => lineProblem(i.product, i.line.quantity, role)).filter(Boolean);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return toast.error("No payment method is available right now.");
    const cleaned = {
      name: cleanText(form.name, 120),
      phone: cleanText(form.phone, 20),
      address: cleanMultiline(form.address, 500),
      city: cleanText(form.city, 80),
      pincode: cleanText(form.pincode, 6),
      gstin: cleanText(form.gstin, 15).toUpperCase(),
      notes: cleanMultiline(form.notes, 1000),
    };
    const parsed = shippingSchema.safeParse(cleaned);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setBusy(true);
    // Only product IDs and quantities are sent. Prices, MOQ and stock are enforced by the server.
    const { data, error } = await supabase.rpc("place_b2b_order", {
      p_items: cart.lines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
      p_payment_method: selected,
      p_shipping: parsed.data,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { order_no: number; total: number };
    cart.clear();
    queryClient.invalidateQueries({ queryKey: ["home"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast.success(`Order #${result.order_no} placed — ${formatINR(result.total)}`);
    navigate({ to: "/orders", search: { placed: result.order_no } });
  }

  return (
    <form onSubmit={placeOrder} className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <h1 className="text-xl font-extrabold">Checkout</h1>
        <section className="space-y-3 rounded-lg border bg-card p-4 shadow-card">
          <h2 className="font-display text-base font-bold">Delivery details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Contact name"><Input required maxLength={120} value={form.name} onChange={set("name")} /></F>
            <F label="Phone"><Input type="tel" required maxLength={20} value={form.phone} onChange={set("phone")} /></F>
          </div>
          <F label="Address"><Textarea required maxLength={500} rows={3} value={form.address} onChange={set("address")} /></F>
          <div className="grid gap-3 sm:grid-cols-3">
            <F label="City"><Input required maxLength={80} value={form.city} onChange={set("city")} /></F>
            <F label="PIN code"><Input inputMode="numeric" required maxLength={6} value={form.pincode} onChange={set("pincode")} /></F>
            <F label="GSTIN (optional)"><Input maxLength={15} value={form.gstin} onChange={set("gstin")} /></F>
          </div>
          <F label="Order notes (optional)"><Textarea maxLength={1000} rows={2} value={form.notes} onChange={set("notes")} /></F>
        </section>

        <section className="space-y-3 rounded-lg border bg-card p-4 shadow-card">
          <h2 className="font-display text-base font-bold">Payment</h2>
          {available.length === 0 && <p className="text-sm text-destructive">No payment methods are enabled. Please contact the store.</p>}
          <div className="grid gap-2 sm:grid-cols-3">
            {available.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 text-left",
                  selected === m.id ? "border-primary bg-secondary ring-1 ring-primary" : "hover:border-primary",
                )}
              >
                <m.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-bold">{m.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{m.text}</span>
                </span>
              </button>
            ))}
          </div>
          {selected === "online" && (
            <p className="text-xs text-muted-foreground">Your order is saved as “awaiting payment”; our team will send a secure payment link.</p>
          )}
        </section>
      </div>

      <aside className="h-fit space-y-3 rounded-lg border bg-card p-4 shadow-card lg:sticky lg:top-36">
        <h2 className="font-display text-base font-bold">Your order</h2>
        <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
          {items.map(({ line, product }) => (
            <li key={line.productId} className="flex justify-between gap-2">
              <span className="min-w-0 truncate">{line.quantity} × {product.name}</span>
              <span className="shrink-0 font-semibold">{formatINR(unitPrice(product, role) * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t pt-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatINR(totals.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">GST ({gst}%)</dt><dd>{formatINR(totals.gst)}</dd></div>
          <div className="flex justify-between border-t pt-2 text-base font-extrabold"><dt>Total</dt><dd>{formatINR(totals.total)}</dd></div>
        </dl>
        {problems.length > 0 && <p className="text-xs font-semibold text-destructive">{problems[0]} — <Link to="/cart" className="underline">edit cart</Link></p>}
        <Button type="submit" variant="cta" size="lg" className="w-full" disabled={busy || problems.length > 0 || !selected}>
          {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Place order
        </Button>
        <p className="text-[11px] text-muted-foreground">Prices are re-checked against live stock and your account tier when you place the order.</p>
      </aside>
    </form>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
    </div>
  );
}
