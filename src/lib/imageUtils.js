export function optimizedImageUrl(url, width = 400, quality = 78) {
  if (!url || typeof url !== "string") return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("images.unsplash.com")) {
      parsed.searchParams.set("w", String(width));
      parsed.searchParams.set("q", String(quality));
      parsed.searchParams.set("fit", parsed.searchParams.get("fit") || "crop");
      parsed.searchParams.set("auto", "format");
      return parsed.toString();
    }
  } catch {}
  return url;
}