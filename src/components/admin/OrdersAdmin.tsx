import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/pricing";

const STATUSES = ["pending", "confirmed", "dispatched", "delivered", "cancelled"] as const;
const PAYMENTS = ["unpaid", "awaiting_gateway", "paid", "refunded"] as const;

export function OrdersAdmin() {
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  async function update(id: string, patch: { status?: string; payment_status?: string }) {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
  }

  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />;
  if (!orders.length) return <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">No orders yet</p>;

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <article key={o.id} className="rounded-lg border bg-card">
          <header className="flex flex-wrap items-center gap-2 border-b bg-surface px-3 py-2">
            <p className="font-display text-sm font-bold">#{o.order_no}</p>
            <Badge variant={o.role_at_order === "dealer" ? "wholesale" : "secondary"} className="capitalize">{o.role_at_order}</Badge>
            <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</span>
            <span className="ml-auto font-extrabold">{formatINR(o.total)}</span>
          </header>
          <div className="grid gap-3 p-3 text-sm sm:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <p className="font-semibold">{o.ship_name} · {o.ship_phone}</p>
              <p className="text-xs text-muted-foreground">{o.ship_address}, {o.ship_city} {o.ship_pincode}{o.gstin && ` · GSTIN ${o.gstin}`}</p>
              <ul className="text-xs">
                {o.order_items.map((it) => <li key={it.id}>{it.quantity} × {it.product_name} @ {formatINR(it.unit_price)}</li>)}
              </ul>
              {o.notes && <p className="text-xs italic text-muted-foreground">“{o.notes}”</p>}
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <label className="space-y-0.5">
                <span className="block font-semibold">Status</span>
                <select value={o.status} onChange={(e) => void update(o.id, { status: e.target.value })} className="h-8 rounded-md border bg-background px-2 capitalize">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="space-y-0.5">
                <span className="block font-semibold">Payment ({o.payment_method.replace("_", " ")})</span>
                <select value={o.payment_status} onChange={(e) => void update(o.id, { payment_status: e.target.value })} className="h-8 rounded-md border bg-background px-2">
                  {PAYMENTS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </label>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
