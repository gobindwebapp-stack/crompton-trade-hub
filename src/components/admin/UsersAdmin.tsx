import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppRole } from "@/lib/pricing";

const RANK: Record<AppRole, number> = { admin: 1, dealer: 2, retailer: 3 };

export function UsersAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profiles.error) throw profiles.error;
      if (roles.error) throw roles.error;
      return profiles.data.map((p) => {
        const r = roles.data.filter((x) => x.user_id === p.id).map((x) => x.role as AppRole).sort((a, b) => RANK[a] - RANK[b]);
        return { ...p, role: (r[0] ?? "retailer") as AppRole };
      });
    },
  });

  async function setRole(userId: string, role: "dealer" | "retailer") {
    setPending(userId);
    const { error } = await supabase.rpc("set_user_role", { p_user: userId, p_role: role });
    setPending(null);
    if (error) return toast.error(error.message);
    toast.success(role === "dealer" ? "Upgraded to Dealer" : "Moved to Retailer");
    qc.invalidateQueries({ queryKey: ["admin", "users"] });
  }

  const term = q.trim().toLowerCase();
  const list = (data ?? []).filter((u) => !term || `${u.full_name} ${u.email} ${u.business_name}`.toLowerCase().includes(term));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users" className="pl-8" />
      </div>
      {isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {list.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{u.full_name || "—"} <span className="font-normal text-muted-foreground">· {u.business_name || "No business name"}</span></p>
                <p className="truncate text-xs text-muted-foreground">{u.email} {u.phone && `· ${u.phone}`}</p>
              </div>
              <Badge variant={u.role === "admin" ? "default" : u.role === "dealer" ? "wholesale" : "secondary"} className="capitalize">{u.role}</Badge>
              {u.role === "retailer" && (
                <Button size="sm" variant="wholesale" disabled={pending === u.id} onClick={() => void setRole(u.id, "dealer")}>
                  <ArrowUp /> Upgrade to Dealer
                </Button>
              )}
              {u.role === "dealer" && (
                <Button size="sm" variant="outline" disabled={pending === u.id} onClick={() => void setRole(u.id, "retailer")}>
                  <ArrowDown /> Degrade to Retailer
                </Button>
              )}
            </li>
          ))}
          {list.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No users yet</li>}
        </ul>
      )}
    </div>
  );
}
