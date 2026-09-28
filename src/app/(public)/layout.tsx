import { PublicFooter, PublicHeader } from "@/components/public-layout";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="public-theme">
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
