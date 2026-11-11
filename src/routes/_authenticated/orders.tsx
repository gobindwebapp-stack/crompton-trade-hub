import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { CheckCircle2, Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/orders")({
  validateSearch: z.object({ placed: z.number().optional().catch(undefined) }),
  head: () => ({
    meta: [
      { title: "My orders — Crompton Trade Hub" },
      { name: "description", content: "Track your wholesale orders and payment status." },
      { property: "og:title", content: "My orders — Crompton Trade Hub" },
      { property: "og:description", content: "Order history and status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const PAY_LABEL: Record<string, string> = {
  cod: "Cash on delivery",
  bank_transfer: "Bank transfer",
  online: "Online",
};

function OrdersPage() {
  const { placed } = Route.useSearch();
  const { user } = useAuth();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-4">
      {placed && (
        <div className="flex items-center gap-3 rounded-lg border border-wholesale/30 bg-wholesale-soft p-4 text-wholesale">
          <CheckCircle2 className="h-6 w-6 shrink-0" />
          <p className="text-sm font-semibold">Order #{placed} received. We'll confirm it shortly.</p>
        </div>
      )}
      <h1 className="text-xl font-extrabold">My orders</h1>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !orders?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-card py-14 text-center">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">No orders yet</p>
          <Button variant="cta" asChild><Link to="/products">Start shopping</Link></Button>
        </div>
      ) : (
        orders.map((o) => (
          <article key={o.id} className="rounded-lg border bg-card shadow-card">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-surface px-4 py-2.5">
              <div>
                <p className="font-display text-sm font-bold">Order #{o.order_no}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</p>
              </div>
              <div className="flex gap-1.5">
                <Badge variant={o.status === "cancelled" ? "destructive" : "secondary"}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
                <Badge variant="outline">{PAY_LABEL[o.payment_method]} · {o.payment_status.replace("_", " ")}</Badge>
              </div>
            </header>
            <ul className="divide-y text-sm">
              {o.order_items.map((it) => (
                <li key={it.id} className="flex justify-between gap-2 px-4 py-2">
                  <span className="min-w-0">{it.quantity} × {it.product_name} <span className="text-xs text-muted-foreground">@ {formatINR(it.unit_price)}</span></span>
                  <span className="shrink-0 font-semibold">{formatINR(it.line_total)}</span>
                </li>
              ))}
            </ul>
            <footer className="flex justify-between border-t px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Incl. GST {formatINR(o.gst_amount)}</span>
              <span className="font-extrabold">{formatINR(o.total)}</span>
            </footer>
          </article>
        ))
      )}
    </div>
  );
}
