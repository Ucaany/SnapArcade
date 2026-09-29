import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/fitur", "/harga", "/tentang", "/kontak", "/faq"].map((path) => ({
    url: new URL(path, siteUrl).toString(),
    changeFrequency: "monthly",
  }));
}
