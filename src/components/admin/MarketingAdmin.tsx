import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cleanText } from "@/lib/sanitize";
import { ImageUpload } from "./ImageUpload";
import { invalidateCatalog } from "./ProductsAdmin";

function safeLink(v: string) {
  const s = cleanText(v, 500);
  if (!s) return "";
  if ((s.startsWith("/") && !s.startsWith("//")) || s.startsWith("https://")) return s;
  return null;
}

export function MarketingAdmin() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <BannersPanel />
      <AdsPanel />
    </div>
  );
}

function BannersPanel() {
  const qc = useQueryClient();
  const { data: banners = [] } = useQuery({
    queryKey: ["admin", "banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("kind").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Tables<"banners">> }) => {
      const { error } = await supabase.from("banners").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCatalog(qc),
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCatalog(qc),
  });

  const [f, setF] = useState({ kind: "banner" as "banner" | "scheme", title: "", subtitle: "", badge_text: "", link_url: "", image_url: null as string | null });
  const [busy, setBusy] = useState(false);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const link = safeLink(f.link_url);
    if (link === null) return toast.error("Link must start with / or https://");
    const title = cleanText(f.title, 120);
    if (title.length < 2) return toast.error("Add a title");
    setBusy(true);
    const { error } = await supabase.from("banners").insert({
      kind: f.kind,
      title,
      subtitle: cleanText(f.subtitle, 200),
      badge_text: cleanText(f.badge_text, 30),
      link_url: link,
      image_url: f.image_url,
      sort_order: banners.length + 1,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setF({ kind: f.kind, title: "", subtitle: "", badge_text: "", link_url: "", image_url: null });
    invalidateCatalog(qc);
    toast.success("Added");
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="font-display text-base font-bold">Banners & schemes</h3>
      <ul className="divide-y rounded-md border">
        {banners.map((b) => (
          <li key={b.id} className="flex items-center gap-3 p-2.5">
            {b.image_url ? <img src={b.image_url} alt="" className="h-10 w-16 rounded object-cover" /> : <div className="h-10 w-16 rounded bg-scheme" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{b.title}</p>
              <Badge variant={b.kind === "scheme" ? "cta" : "secondary"}>{b.kind}</Badge>
            </div>
            <Switch checked={b.is_active} onCheckedChange={(v) => update.mutate({ id: b.id, patch: { is_active: v } })} aria-label="Active" />
            <Button variant="ghost" size="icon" onClick={() => confirm("Delete this?") && del.mutate(b.id)} aria-label="Delete"><Trash2 /></Button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="space-y-2 rounded-md bg-surface p-3">
        <p className="text-xs font-bold">Add new</p>
        <div className="flex gap-2">
          {(["banner", "scheme"] as const).map((k) => (
            <Button key={k} type="button" size="sm" variant={f.kind === k ? "default" : "outline"} onClick={() => setF({ ...f, kind: k })}>
              {k === "banner" ? "Hero banner" : "Scheme card"}
            </Button>
          ))}
        </div>
        <Input placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Input placeholder="Subtitle" value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Badge (e.g. Limited)" value={f.badge_text} onChange={(e) => setF({ ...f, badge_text: e.target.value })} />
          <Input placeholder="Link (/products?category=…)" value={f.link_url} onChange={(e) => setF({ ...f, link_url: e.target.value })} />
        </div>
        {f.kind === "banner" && <ImageUpload value={f.image_url} onChange={(url) => setF({ ...f, image_url: url })} folder="banners" />}
        <Button type="submit" size="sm" variant="cta" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Plus />} Add {f.kind}</Button>
      </form>
    </section>
  );
}

function AdsPanel() {
  const qc = useQueryClient();
  const { data: ads = [] } = useQuery({
    queryKey: ["admin", "ads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sponsored_ads").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const update = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("sponsored_ads").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCatalog(qc),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sponsored_ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCatalog(qc),
  });
  const [f, setF] = useState({ sponsor_name: "", headline: "", body: "", link_url: "", cta_label: "Learn more", image_url: null as string | null });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const link = safeLink(f.link_url);
    if (link === null || (link && !link.startsWith("https://"))) return toast.error("Sponsor link must start with https://");
    if (cleanText(f.sponsor_name, 80).length < 2 || cleanText(f.headline, 140).length < 2) return toast.error("Add sponsor and headline");
    const { error } = await supabase.from("sponsored_ads").insert({
      sponsor_name: cleanText(f.sponsor_name, 80),
      headline: cleanText(f.headline, 140),
      body: cleanText(f.body, 300),
      link_url: link,
      cta_label: cleanText(f.cta_label, 30) || "Learn more",
      image_url: f.image_url,
      sort_order: ads.length + 1,
    });
    if (error) return toast.error(error.message);
    setF({ sponsor_name: "", headline: "", body: "", link_url: "", cta_label: "Learn more", image_url: null });
    invalidateCatalog(qc);
    toast.success("Sponsored ad added");
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="font-display text-base font-bold">Third-party sponsored ads</h3>
      <ul className="divide-y rounded-md border">
        {ads.map((a) => (
          <li key={a.id} className="flex items-center gap-3 p-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{a.headline}</p>
              <p className="text-xs text-muted-foreground">{a.sponsor_name}</p>
            </div>
            <Switch checked={a.is_active} onCheckedChange={(v) => update.mutate({ id: a.id, is_active: v })} aria-label="Active" />
            <Button variant="ghost" size="icon" onClick={() => confirm("Delete this ad?") && del.mutate(a.id)} aria-label="Delete"><Trash2 /></Button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="space-y-2 rounded-md bg-surface p-3">
        <p className="text-xs font-bold">Add sponsor</p>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Sponsor name" value={f.sponsor_name} onChange={(e) => setF({ ...f, sponsor_name: e.target.value })} />
          <Input placeholder="Button label" value={f.cta_label} onChange={(e) => setF({ ...f, cta_label: e.target.value })} />
        </div>
        <Input placeholder="Headline" value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} />
        <Input placeholder="Short text" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        <div className="space-y-1">
          <Label className="text-xs">Sponsor link</Label>
          <Input placeholder="https://…" value={f.link_url} onChange={(e) => setF({ ...f, link_url: e.target.value })} />
        </div>
        <ImageUpload value={f.image_url} onChange={(url) => setF({ ...f, image_url: url })} folder="ads" />
        <Button type="submit" size="sm" variant="cta"><Plus /> Add ad</Button>
      </form>
    </section>
  );
}
