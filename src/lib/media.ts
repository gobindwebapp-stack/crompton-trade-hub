import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/**
 * Compresses an image in the browser to WebP (~82% quality, max 1200px) and uploads it
 * to the product-media bucket. Returns a long-lived link usable by every visitor.
 */
export async function compressAndUpload(file: File, folder: "products" | "banners" | "ads"): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  const { default: imageCompression } = await import("browser-image-compression");
  const webp = await imageCompression(file, {
    fileType: "image/webp",
    initialQuality: 0.82,
    maxWidthOrHeight: folder === "banners" ? 1800 : 1200,
    maxSizeMB: 1,
    useWebWorker: true,
  });
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("product-media").upload(path, webp, {
    contentType: "image/webp",
    cacheControl: "31536000",
  });
  if (error) throw error;
  const { data, error: urlError } = await supabase.storage.from("product-media").createSignedUrl(path, TEN_YEARS);
  if (urlError || !data) throw urlError ?? new Error("Could not create image link");
  return data.signedUrl;
}
