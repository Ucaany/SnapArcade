"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, Camera, CreditCard, LayoutDashboard, Mail, MapPinned, Menu, Package, Settings, ShieldCheck, Users, Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/dashboard/mesin", label: "Mesin", icon: Camera },
  { href: "/dashboard/staff", label: "Staff", icon: Users },
  { href: "/dashboard/pengaturan", label: "Pengaturan", icon: Settings },
];

const adminLinks = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/admin/undangan", label: "Undangan", icon: Mail },
  { href: "/admin/owner", label: "Owner", icon: Users },
  { href: "/admin/paket", label: "Paket langganan", icon: Package },
  { href: "/admin/langganan", label: "Langganan", icon: CreditCard },
  { href: "/admin/transaksi", label: "Transaksi", icon: Wallet },
  { href: "/admin/mesin", label: "Monitoring mesin", icon: Camera },
  { href: "/admin/pengguna", label: "Pengguna", icon: ShieldCheck },
  { href: "/admin/log-aktivitas", label: "Log aktivitas", icon: Activity },
  { href: "/admin/notifikasi", label: "Notifikasi", icon: Bell },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
];

function Navigation({ pathname, links: items, onNavigate }: { pathname: string; links: typeof links; onNavigate?: () => void }) {
  return <nav aria-label="Navigasi dashboard" className="grid gap-1">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={onNavigate} className={cn("flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-accent", (pathname === href || (href !== "/admin" && href !== "/dashboard" && pathname.startsWith(`${href}/`))) && "bg-accent text-accent-foreground")}><Icon aria-hidden="true" className="size-4" />{label}</Link>)}</nav>;
}

export function DashboardShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const navigationLinks = isAdmin ? adminLinks : links;
  const page = navigationLinks.find((link) => link.href === pathname)?.label ?? (isAdmin && pathname.startsWith("/admin/owner/") ? "Detail Owner" : "Dashboard");
  return <div className="min-h-screen md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
    <aside className="hidden border-r bg-sidebar p-4 md:block"><Link className="mb-8 block px-3 text-lg font-semibold" href={isAdmin ? "/admin" : "/dashboard"}>SnapArcade</Link><p className="mb-3 px-3 text-xs font-medium text-muted-foreground">{isAdmin ? "PLATFORM" : "WORKSPACE"}</p><Navigation pathname={pathname} links={navigationLinks} /></aside>
    <div className="min-w-0">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <Sheet><SheetTrigger className="inline-flex size-9 items-center justify-center rounded-md border md:hidden" aria-label="Buka navigasi"><Menu className="size-4" /></SheetTrigger><SheetContent side="left" className="w-72"><SheetHeader><SheetTitle>SnapArcade</SheetTitle></SheetHeader><div className="mt-6"><Navigation pathname={pathname} links={navigationLinks} /></div></SheetContent></Sheet>
          <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href={isAdmin ? "/admin" : "/dashboard"}>{isAdmin ? "Superadmin" : "Dashboard"}</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{page}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
        </div>
        <div className="flex items-center gap-3"><Button variant="ghost" size="icon" aria-label="Notifikasi"><Bell /></Button><Avatar><AvatarFallback>SA</AvatarFallback></Avatar></div>
      </header>
      <main className="p-4 md:p-6">{children}</main>
    </div>
  </div>;
}
