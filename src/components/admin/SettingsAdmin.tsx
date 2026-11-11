import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cleanText } from "@/lib/sanitize";

type Settings = Tables<"app_settings">;

export function SettingsAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
  });
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setS(data);
  }, [data]);
  if (!s) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />;

  async function save() {
    if (!s) return;
    const gst = Number(s.gst_percent);
    if (!Number.isFinite(gst) || gst < 0 || gst > 50) return toast.error("GST must be between 0 and 50");
    if (!s.cod_enabled && !s.bank_transfer_enabled && !s.online_gateway_enabled) {
      return toast.error("Keep at least one payment method on");
    }
    setBusy(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        store_name: cleanText(s.store_name, 80) || "Crompton Trade Hub",
        support_phone: cleanText(s.support_phone, 20),
        gst_percent: gst,
        cod_enabled: s.cod_enabled,
        bank_transfer_enabled: s.bank_transfer_enabled,
        online_gateway_enabled: s.online_gateway_enabled,
        gateway_label: cleanText(s.gateway_label, 60) || "Online payment",
        assistant_enabled: s.assistant_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    qc.invalidateQueries({ queryKey: ["settings"] });
  }

  const toggle = (k: "cod_enabled" | "bank_transfer_enabled" | "online_gateway_enabled" | "assistant_enabled") => (v: boolean) =>
    setS({ ...s, [k]: v });

  return (
    <div className="max-w-2xl space-y-4">
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-display text-base font-bold">Payment methods at checkout</h3>
        <Row label="Cash on delivery" hint="Customers pay when goods arrive"><Switch checked={s.cod_enabled} onCheckedChange={toggle("cod_enabled")} /></Row>
        <Row label="Bank transfer / NEFT" hint="Order saved as unpaid until you mark it paid"><Switch checked={s.bank_transfer_enabled} onCheckedChange={toggle("bank_transfer_enabled")} /></Row>
        <Row label="Online payment gateway" hint="Orders saved as “awaiting payment” — connect a live gateway to collect automatically">
          <Switch checked={s.online_gateway_enabled} onCheckedChange={toggle("online_gateway_enabled")} />
        </Row>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Gateway label shown to buyers</Label>
          <Input value={s.gateway_label} onChange={(e) => setS({ ...s, gateway_label: e.target.value })} />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-display text-base font-bold">Store</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-semibold">Store name</Label>
            <Input value={s.store_name} onChange={(e) => setS({ ...s, store_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">GST %</Label>
            <Input type="number" min={0} max={50} step="0.01" value={s.gst_percent} onChange={(e) => setS({ ...s, gst_percent: Number(e.target.value) })} />
          </div>
        </div>
        <Row label="AI shopping assistant" hint="Floating chat helper on every page"><Switch checked={s.assistant_enabled} onCheckedChange={toggle("assistant_enabled")} /></Row>
      </section>

      <Button variant="cta" onClick={() => void save()} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Save />} Save settings</Button>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}
