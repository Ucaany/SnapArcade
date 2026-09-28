import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://snaparcade.id";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/staff"] }, sitemap: new URL("/sitemap.xml", baseUrl).toString() };
}
