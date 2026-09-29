import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { softwareApplicationJsonLd } from "@/lib/seo";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="public-theme">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd).replace(/</g, "\\u003c") }} />
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
