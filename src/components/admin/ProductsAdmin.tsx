import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatINR } from "@/lib/pricing";
import { cleanMultiline, cleanText } from "@/lib/sanitize";
import { slugify } from "@/lib/slug";
import { ImageUpload } from "./ImageUpload";
import { SpecBuilder, type Specs } from "./SpecBuilder";

type Product = Tables<"products">;
type Category = Tables<"categories">;

export function useAdminCategories() {
  return useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function invalidateCatalog(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin"] });
  qc.invalidateQueries({ queryKey: ["home"] });
  qc.invalidateQueries({ queryKey: ["products"] });
  qc.invalidateQueries({ queryKey: ["product"] });
  qc.invalidateQueries({ queryKey: ["categories"] });
}

export function ProductsAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const { data: categories = [] } = useAdminCategories();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Product> }) => {
      const { error } = await supabase.from("products").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCatalog(qc),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      invalidateCatalog(qc);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const term = q.trim().toLowerCase();
  const list = term ? products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(term)) : products;
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or SKU" className="pl-8" />
        </div>
        <Button variant="cta" onClick={() => setEditing({ specs: {}, is_active: true, dealer_moq: 10, retailer_moq: 1, unit: "pc", brand: "Crompton" })}>
          <Plus /> New product
        </Button>
      </div>

      <CategoryManager categories={categories} />

      {isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2">Product</th>
                <th className="p-2">Category</th>
                <th className="p-2 text-right">Retail</th>
                <th className="p-2 text-right">Dealer</th>
                <th className="p-2 text-right">MOQ</th>
                <th className="p-2 text-right">Stock</th>
                <th className="p-2">Live</th>
                <th className="p-2">Featured</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <img src={p.image_url || "/images/products/ceiling-fan.webp"} alt="" className="h-9 w-9 rounded bg-surface object-contain" loading="lazy" />
                      <div className="min-w-0">
                        <p className="max-w-56 truncate font-semibold">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 text-xs">{catName(p.category_id)}</td>
                  <td className="p-2 text-right">{formatINR(p.retail_price)}</td>
                  <td className="p-2 text-right text-wholesale">{formatINR(p.wholesale_price)}</td>
                  <td className="p-2 text-right text-xs">{p.dealer_moq} / {p.retailer_moq}</td>
                  <td className="p-2 text-right">{p.stock <= 0 ? <Badge variant="destructive">0</Badge> : p.stock}</td>
                  <td className="p-2"><Switch checked={p.is_active} onCheckedChange={(v) => toggle.mutate({ id: p.id, patch: { is_active: v } })} /></td>
                  <td className="p-2"><Switch checked={p.is_featured} onCheckedChange={(v) => toggle.mutate({ id: p.id, patch: { is_featured: v } })} /></td>
                  <td className="p-2">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(p)} aria-label="Edit"><Pencil /></Button>
                      <Button variant="ghost" size="icon" onClick={() => confirm(`Delete ${p.name}?`) && remove.mutate(p.id)} aria-label="Delete"><Trash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No products</p>}
        </div>
      )}

      {editing && <ProductEditor product={editing} categories={categories} onClose={() => setEditing(null)} />}
    </div>
  );
}

const productSchema = z
  .object({
    sku: z.string().min(2, "SKU is required").max(60),
    name: z.string().min(2, "Name is required").max(200),
    description: z.string().max(4000),
    brand: z.string().max(80),
    category_id: z.string().uuid().nullable(),
    image_url: z.string().max(2000).nullable(),
    retail_price: z.number().min(0),
    wholesale_price: z.number().min(0),
    dealer_moq: z.number().int().min(1),
    retailer_moq: z.number().int().min(1),
    stock: z.number().int().min(0),
    unit: z.string().min(1).max(20),
    is_active: z.boolean(),
    is_featured: z.boolean(),
  })
  .refine((v) => v.wholesale_price <= v.retail_price, { message: "Dealer price should not exceed retail price" });

function ProductEditor({ product, categories, onClose }: { product: Partial<Product>; categories: Category[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    sku: product.sku ?? "",
    name: product.name ?? "",
    description: product.description ?? "",
    brand: product.brand ?? "Crompton",
    category_id: product.category_id ?? null,
    image_url: product.image_url ?? null,
    retail_price: String(product.retail_price ?? ""),
    wholesale_price: String(product.wholesale_price ?? ""),
    dealer_moq: String(product.dealer_moq ?? 10),
    retailer_moq: String(product.retailer_moq ?? 1),
    stock: String(product.stock ?? 0),
    unit: product.unit ?? "pc",
    is_active: product.is_active ?? true,
    is_featured: product.is_featured ?? false,
  });
  const [specs, setSpecs] = useState<Specs>((product.specs as Specs) ?? {});
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = productSchema.safeParse({
      ...f,
      sku: cleanText(f.sku, 60).toUpperCase(),
      name: cleanText(f.name, 200),
      description: cleanMultiline(f.description, 4000),
      brand: cleanText(f.brand, 80),
      unit: cleanText(f.unit, 20),
      retail_price: Number(f.retail_price),
      wholesale_price: Number(f.wholesale_price),
      dealer_moq: Number(f.dealer_moq),
      retailer_moq: Number(f.retailer_moq),
      stock: Number(f.stock),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const cleanSpecs: Specs = {};
    for (const [k, v] of Object.entries(specs)) cleanSpecs[cleanText(k, 60)] = cleanText(v, 200);

    setBusy(true);
    const row = { ...parsed.data, specs: cleanSpecs, slug: product.slug ?? `${slugify(parsed.data.name)}-${slugify(parsed.data.sku)}` };
    const { error } = product.id
      ? await supabase.from("products").update(row).eq("id", product.id)
      : await supabase.from("products").insert(row);
    setBusy(false);
    if (error) return toast.error(error.message.includes("duplicate") ? "That SKU already exists" : error.message);
    toast.success("Product saved");
    invalidateCatalog(qc);
    onClose();
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product.id ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <ImageUpload value={f.image_url} onChange={(url) => setF((s) => ({ ...s, image_url: url }))} folder="products" />
          <div className="grid gap-3 sm:grid-cols-2">
            <L label="Product name"><Input required value={f.name} onChange={set("name")} /></L>
            <L label="SKU"><Input required value={f.sku} onChange={set("sku")} /></L>
            <L label="Brand"><Input value={f.brand} onChange={set("brand")} /></L>
            <L label="Category">
              <select
                value={f.category_id ?? ""}
                onChange={(e) => setF((s) => ({ ...s, category_id: e.target.value || null }))}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </L>
          </div>
          <L label="Description"><Textarea rows={3} value={f.description} onChange={set("description")} /></L>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <L label="Retail price (₹)"><Input type="number" step="0.01" min={0} required value={f.retail_price} onChange={set("retail_price")} /></L>
            <L label="Dealer price (₹)"><Input type="number" step="0.01" min={0} required value={f.wholesale_price} onChange={set("wholesale_price")} /></L>
            <L label="Stock"><Input type="number" min={0} required value={f.stock} onChange={set("stock")} /></L>
            <L label="Dealer MOQ"><Input type="number" min={1} required value={f.dealer_moq} onChange={set("dealer_moq")} /></L>
            <L label="Retailer min qty"><Input type="number" min={1} required value={f.retailer_moq} onChange={set("retailer_moq")} /></L>
            <L label="Unit"><Input value={f.unit} onChange={set("unit")} /></L>
          </div>
          <L label="Specifications"><SpecBuilder value={specs} onChange={setSpecs} /></L>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_active} onCheckedChange={(v) => setF((s) => ({ ...s, is_active: v }))} /> Live on store</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_featured} onCheckedChange={(v) => setF((s) => ({ ...s, is_featured: v }))} /> Featured</label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="cta" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Save product</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryManager({ categories }: { categories: Category[] }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = cleanText(name, 80);
    if (n.length < 2) return;
    const { error } = await supabase.from("categories").insert({ name: n, slug: slugify(n), sort_order: categories.length + 1 });
    if (error) return toast.error(error.message.includes("duplicate") ? "Category already exists" : error.message);
    setName("");
    invalidateCatalog(qc);
  }
  return (
    <form onSubmit={add} className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
      <span className="text-xs font-bold">Categories:</span>
      {categories.map((c) => <Badge key={c.id} variant="secondary">{c.name}</Badge>)}
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" className="h-8 w-40" />
      <Button type="submit" size="sm" variant="outline"><Plus /> Add</Button>
    </form>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
    </div>
  );
}
