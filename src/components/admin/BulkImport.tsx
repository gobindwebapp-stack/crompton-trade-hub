import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/pricing";
import { parseImportRow, productSlug, TEMPLATE_ROWS, type ParsedRow } from "@/lib/bulk-import";
import { slugify } from "@/lib/slug";
import { invalidateCatalog } from "./ProductsAdmin";

const ACCEPT = ".xlsx,.xls,.ods,.csv";
const MAX_ROWS = 2000;

export function BulkImport() {
  const qc = useQueryClient();
  const ref = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("File is larger than 10 MB");
    setParsing(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (raw.length > MAX_ROWS) toast.warning(`Only the first ${MAX_ROWS} rows will be imported`);
      setRows(raw.slice(0, MAX_ROWS).map((r, i) => parseImportRow(r, i + 2)));
      setFileName(file.name);
    } catch {
      toast.error("Could not read that file. Use .xlsx, .xls, .ods or .csv");
    } finally {
      setParsing(false);
      if (ref.current) ref.current.value = "";
    }
  }

  async function downloadTemplate(ext: "xlsx" | "ods") {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(TEMPLATE_ROWS);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, `trade-hub-import-template.${ext}`, { bookType: ext });
  }

  const valid = rows.filter((r) => r.row);
  const invalid = rows.filter((r) => !r.row);

  async function runImport() {
    if (valid.length === 0) return;
    setBusy(true);
    try {
      // Resolve categories by name/slug, creating any that are missing.
      const { data: cats, error: catErr } = await supabase.from("categories").select("id, name, slug");
      if (catErr) throw catErr;
      const map = new Map<string, string>();
      cats.forEach((c) => {
        map.set(c.name.toLowerCase(), c.id);
        map.set(c.slug, c.id);
      });
      const missing = [...new Set(valid.map((r) => r.row!.category).filter((c) => c && !map.has(c.toLowerCase()) && !map.has(slugify(c))))];
      if (missing.length) {
        const { data: created, error } = await supabase
          .from("categories")
          .insert(missing.map((name, i) => ({ name, slug: slugify(name), sort_order: cats.length + i + 1 })))
          .select("id, name, slug");
        if (error) throw error;
        created.forEach((c) => {
          map.set(c.name.toLowerCase(), c.id);
          map.set(c.slug, c.id);
        });
      }

      const payload = valid.map(({ row }) => {
        const r = row!;
        return {
          sku: r.sku,
          name: r.name,
          slug: productSlug(r.name, r.sku),
          description: r.description,
          brand: r.brand,
          category_id: r.category ? (map.get(r.category.toLowerCase()) ?? map.get(slugify(r.category)) ?? null) : null,
          retail_price: r.retail_price,
          wholesale_price: r.wholesale_price,
          dealer_moq: r.dealer_moq,
          retailer_moq: r.retailer_moq,
          stock: r.stock,
          unit: r.unit,
          specs: r.specs,
          is_featured: r.is_featured,
          is_active: true,
          ...(r.image_url ? { image_url: r.image_url } : {}),
        };
      });

      // Deduplicate by SKU (last row wins), then upsert in chunks.
      const bySku = new Map(payload.map((p) => [p.sku, p]));
      const unique = [...bySku.values()];
      for (let i = 0; i < unique.length; i += 200) {
        const { error } = await supabase.from("products").upsert(unique.slice(i, i + 200), { onConflict: "sku" });
        if (error) throw error;
      }
      toast.success(`Imported ${unique.length} products${missing.length ? ` and ${missing.length} new categories` : ""}`);
      invalidateCatalog(qc);
      setRows([]);
      setFileName(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-display text-base font-bold">Universal bulk import</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a spreadsheet from MS Excel (.xlsx, .xls), LibreOffice Calc (.ods) or a .csv. Rows are matched by SKU:
          existing products are updated, new SKUs are created.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input ref={ref} type="file" accept={ACCEPT} className="hidden" onChange={(e) => void readFile(e.target.files?.[0])} />
          <Button variant="cta" onClick={() => ref.current?.click()} disabled={parsing}>
            {parsing ? <Loader2 className="animate-spin" /> : <Upload />} Choose file
          </Button>
          <Button variant="outline" onClick={() => void downloadTemplate("xlsx")}><Download /> Excel template</Button>
          <Button variant="outline" onClick={() => void downloadTemplate("ods")}><Download /> Calc template</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Columns: SKU, Name, Category, Description, Brand, Retail Price, Wholesale Price, Dealer MOQ, Retailer MOQ, Stock,
          Unit, Image URL, Specs (JSON or “Key: Value; Key: Value”), Featured.
        </p>
      </div>

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">{fileName}</span>
            <Badge variant="wholesale"><CheckCircle2 className="mr-1 h-3 w-3" /> {valid.length} ready</Badge>
            {invalid.length > 0 && <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> {invalid.length} with errors</Badge>}
            <Button className="ml-auto" variant="cta" disabled={busy || valid.length === 0} onClick={() => void runImport()}>
              {busy && <Loader2 className="animate-spin" />} Import {valid.length} products
            </Button>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-lg border bg-card">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="sticky top-0 bg-surface text-left text-muted-foreground">
                <tr><th className="p-2">Row</th><th className="p-2">SKU</th><th className="p-2">Name</th><th className="p-2">Category</th><th className="p-2 text-right">Retail</th><th className="p-2 text-right">Dealer</th><th className="p-2 text-right">MOQ</th><th className="p-2">Status</th></tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.line} className={r.row ? "" : "bg-destructive/5"}>
                    <td className="p-2 text-muted-foreground">{r.line}</td>
                    <td className="p-2 font-mono">{r.row?.sku ?? "—"}</td>
                    <td className="p-2">{r.row?.name ?? "—"}</td>
                    <td className="p-2">{r.row?.category || "—"}</td>
                    <td className="p-2 text-right">{r.row ? formatINR(r.row.retail_price) : "—"}</td>
                    <td className="p-2 text-right">{r.row ? formatINR(r.row.wholesale_price) : "—"}</td>
                    <td className="p-2 text-right">{r.row?.dealer_moq ?? "—"}</td>
                    <td className="p-2">{r.row ? <span className="text-wholesale">OK</span> : <span className="text-destructive">{r.errors.join(", ")}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
