import { slugify } from "./slug";

export type ImportRow = {
  sku: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  retail_price: number;
  wholesale_price: number;
  dealer_moq: number;
  retailer_moq: number;
  stock: number;
  unit: string;
  image_url: string | null;
  specs: Record<string, string>;
  is_featured: boolean;
};

export type ParsedRow = { line: number; row: ImportRow | null; errors: string[] };

const ALIASES: Record<keyof ImportRow, string[]> = {
  sku: ["sku", "item code", "code", "product code"],
  name: ["name", "product name", "product", "title"],
  description: ["description", "desc", "details"],
  brand: ["brand"],
  category: ["category", "category name", "group"],
  retail_price: ["retail price", "retail_price", "mrp", "price", "retail"],
  wholesale_price: ["wholesale price", "wholesale_price", "dealer price", "dealer_price", "wholesale", "dealer"],
  dealer_moq: ["dealer moq", "dealer_moq", "moq", "min order qty", "minimum order"],
  retailer_moq: ["retailer moq", "retailer_moq", "retail moq", "retail min qty"],
  stock: ["stock", "qty", "quantity", "inventory"],
  unit: ["unit", "uom"],
  image_url: ["image url", "image_url", "image", "photo"],
  specs: ["specs", "specifications", "attributes"],
  is_featured: ["featured", "is_featured", "bestseller"],
};

function norm(s: string) {
  return s.toString().trim().toLowerCase().replace(/[_\s]+/g, " ");
}

function pick(raw: Record<string, unknown>, field: keyof ImportRow): unknown {
  const keys = Object.keys(raw);
  for (const alias of ALIASES[field]) {
    const k = keys.find((key) => norm(key) === norm(alias));
    if (k !== undefined && raw[k] !== "" && raw[k] !== null && raw[k] !== undefined) return raw[k];
  }
  return undefined;
}

function strip(v: unknown, max: number): string {
  return String(v ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  return Number(String(v ?? "").replace(/[₹,\s]/g, ""));
}

/** Accepts a JSON object string or "Key: Value; Key: Value" text. */
export function parseSpecs(v: unknown): Record<string, string> | null {
  const s = String(v ?? "").trim();
  if (!s) return {};
  if (s.startsWith("{")) {
    try {
      const obj = JSON.parse(s);
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
      return Object.fromEntries(Object.entries(obj).map(([k, val]) => [strip(k, 60), strip(val, 200)]));
    } catch {
      return null;
    }
  }
  const out: Record<string, string> = {};
  for (const part of s.split(/[;|\n]/)) {
    const idx = part.indexOf(":");
    if (idx > 0) out[strip(part.slice(0, idx), 60)] = strip(part.slice(idx + 1), 200);
  }
  return out;
}

export function parseImportRow(raw: Record<string, unknown>, line: number): ParsedRow {
  const errors: string[] = [];
  const sku = strip(pick(raw, "sku"), 60).toUpperCase();
  const name = strip(pick(raw, "name"), 200);
  const retail = num(pick(raw, "retail_price"));
  const wholesaleRaw = pick(raw, "wholesale_price");
  const wholesale = wholesaleRaw === undefined ? retail : num(wholesaleRaw);
  const dmoqRaw = pick(raw, "dealer_moq");
  const dealer_moq = dmoqRaw === undefined ? 1 : num(dmoqRaw);
  const rmoqRaw = pick(raw, "retailer_moq");
  const retailer_moq = rmoqRaw === undefined ? 1 : num(rmoqRaw);
  const stockRaw = pick(raw, "stock");
  const stock = stockRaw === undefined ? 0 : num(stockRaw);
  const specs = parseSpecs(pick(raw, "specs"));
  const img = strip(pick(raw, "image_url"), 2000);
  const featured = norm(String(pick(raw, "is_featured") ?? ""));

  if (!sku) errors.push("Missing SKU");
  if (name.length < 2) errors.push("Missing name");
  if (!Number.isFinite(retail) || retail < 0) errors.push("Invalid retail price");
  if (!Number.isFinite(wholesale) || wholesale < 0) errors.push("Invalid wholesale price");
  if (Number.isFinite(retail) && Number.isFinite(wholesale) && wholesale > retail) errors.push("Wholesale price above retail");
  if (!Number.isInteger(dealer_moq) || dealer_moq < 1) errors.push("Dealer MOQ must be a whole number ≥ 1");
  if (!Number.isInteger(retailer_moq) || retailer_moq < 1) errors.push("Retailer MOQ must be a whole number ≥ 1");
  if (!Number.isInteger(stock) || stock < 0) errors.push("Stock must be a whole number ≥ 0");
  if (specs === null) errors.push("Specs must be JSON or 'Key: Value; Key: Value'");
  if (img && !/^(https:\/\/|\/)/.test(img)) errors.push("Image URL must start with https:// or /");

  if (errors.length) return { line, row: null, errors };
  return {
    line,
    errors,
    row: {
      sku,
      name,
      description: strip(pick(raw, "description"), 4000),
      brand: strip(pick(raw, "brand"), 80) || "Crompton",
      category: strip(pick(raw, "category"), 80),
      retail_price: Math.round(retail * 100) / 100,
      wholesale_price: Math.round(wholesale * 100) / 100,
      dealer_moq,
      retailer_moq,
      stock,
      unit: strip(pick(raw, "unit"), 20) || "pc",
      image_url: img || null,
      specs: specs ?? {},
      is_featured: ["yes", "y", "true", "1"].includes(featured),
    },
  };
}

export function productSlug(name: string, sku: string) {
  return `${slugify(name)}-${slugify(sku)}`;
}

export const TEMPLATE_ROWS = [
  {
    SKU: "CF-NEW-1200",
    Name: "Sample 1200mm Ceiling Fan",
    Category: "Ceiling Fans",
    Description: "Short product description",
    Brand: "Crompton",
    "Retail Price": 2499,
    "Wholesale Price": 1890,
    "Dealer MOQ": 10,
    "Retailer MOQ": 1,
    Stock: 500,
    Unit: "pc",
    "Image URL": "",
    Specs: "Sweep: 1200 mm; Power: 50 W; Warranty: 2 years",
    Featured: "no",
  },
];
