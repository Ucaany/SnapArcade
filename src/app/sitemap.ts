import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/fitur", "/harga", "/tentang", "/kontak", "/faq", "/syarat-ketentuan", "/kebijakan-privasi"].map((path) => ({
    url: new URL(path, process.env.NEXT_PUBLIC_APP_URL ?? "https://snaparcade.id").toString(),
    changeFrequency: "monthly",
  }));
}
