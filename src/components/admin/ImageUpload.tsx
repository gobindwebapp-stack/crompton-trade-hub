import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { compressAndUpload } from "@/lib/media";

export function ImageUpload({
  value,
  onChange,
  folder,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: "products" | "banners" | "ads";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const before = file.size;
      const url = await compressAndUpload(file, folder);
      onChange(url);
      toast.success(`Optimised to WebP (${Math.round(before / 1024)} KB → uploaded)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-md border bg-surface">
        {value ? <img src={value} alt="" className="h-full w-full object-contain" /> : <ImagePlus className="h-6 w-6 text-muted-foreground" />}
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-0.5 top-0.5 rounded-full bg-card p-0.5 shadow"
            aria-label="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="space-y-1">
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => void handle(e.target.files?.[0])} />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} {value ? "Replace" : "Upload"} image
        </Button>
        <p className="text-[11px] text-muted-foreground">Auto-compressed to WebP at 82% quality</p>
      </div>
    </div>
  );
}
