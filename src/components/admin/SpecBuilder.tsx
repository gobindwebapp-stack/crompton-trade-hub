import { useState } from "react";
import { Plus, Trash2, Braces } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type Specs = Record<string, string>;

export function SpecBuilder({ value, onChange }: { value: Specs; onChange: (v: Specs) => void }) {
  const [rows, setRows] = useState<[string, string][]>(() => {
    const e = Object.entries(value ?? {});
    return e.length ? e.map(([k, v]) => [k, String(v)]) : [["", ""]];
  });
  const [raw, setRaw] = useState<string | null>(null);

  function commit(next: [string, string][]) {
    setRows(next);
    const obj: Specs = {};
    for (const [k, v] of next) {
      const key = k.trim().slice(0, 60);
      if (key) obj[key] = v.trim().slice(0, 200);
    }
    onChange(obj);
  }

  if (raw !== null) {
    return (
      <div className="space-y-2">
        <Textarea rows={6} value={raw} onChange={(e) => setRaw(e.target.value)} className="font-mono text-xs" />
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              try {
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
                const next = Object.entries(parsed).map(([k, v]) => [k, String(v)] as [string, string]);
                commit(next.length ? next : [["", ""]]);
                setRaw(null);
              } catch {
                setRaw(raw);
                alert("Enter a JSON object like {\"Power\": \"28 W\"}");
              }
            }}
          >
            Apply JSON
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setRaw(null)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex gap-2">
          <Input placeholder="Attribute (e.g. Power)" value={k} onChange={(e) => commit(rows.map((r, j) => (j === i ? [e.target.value, r[1]] : r)))} />
          <Input placeholder="Value (e.g. 28 W)" value={v} onChange={(e) => commit(rows.map((r, j) => (j === i ? [r[0], e.target.value] : r)))} />
          <Button type="button" variant="ghost" size="icon" onClick={() => commit(rows.length > 1 ? rows.filter((_, j) => j !== i) : [["", ""]])} aria-label="Remove attribute">
            <Trash2 />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, ["", ""]])}>
          <Plus /> Add attribute
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setRaw(JSON.stringify(value ?? {}, null, 2))}>
          <Braces /> Edit as JSON
        </Button>
      </div>
    </div>
  );
}
