import type { Metadata } from "next";

export const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://snaparcade.id";
export const siteName = "SnapArcade";
export const defaultDescription = "Platform untuk mengelola operasional photobooth, kiosk, dan sesi foto.";
export const ogImage = "/og-image.svg";

export function createPageMetadata(title: string, description: string, path: string): Metadata {
  const pageTitle = `${title} | ${siteName}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "id_ID",
      siteName,
      title: pageTitle,
      description,
      url: path,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${siteName}, operasional photobooth` }],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [ogImage],
    },
  };
}

export const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteName,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: defaultDescription,
  url: siteUrl,
};
