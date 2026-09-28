"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, Camera, CreditCard, LayoutDashboard, Mail, Package, Settings, ShieldCheck, Users, Wallet, Ticket, Palette, ClipboardList, PlugZap, Wrench } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger,
} from "@/components/ui/sidebar08/sidebar";

const links = [
  { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/dashboard/mesin", label: "Mesin", icon: Camera },
  { href: "/dashboard/sesi", label: "Riwayat sesi", icon: ClipboardList },
  { href: "/dashboard/transaksi", label: "Transaksi", icon: Wallet },
  { href: "/dashboard/voucher", label: "Voucher", icon: Ticket },
  { href: "/dashboard/payment", label: "Payment gateway", icon: PlugZap },
  { href: "/dashboard/kustomisasi", label: "Kustomisasi kiosk", icon: Palette },
  { href: "/dashboard/langganan", label: "Langganan", icon: CreditCard },
  { href: "/dashboard/staff", label: "Staff", icon: Users },
  { href: "/dashboard/notifikasi", label: "Notifikasi", icon: Bell },
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

const staffLinks = [
  { href: "/staff", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/staff/mesin/wedding-andini-bagas", label: "Detail kiosk", icon: Camera },
  { href: "/staff/sesi", label: "Riwayat sesi", icon: ClipboardList },
  { href: "/staff/hardware", label: "Diagnostik hardware", icon: Wrench },
  { href: "/staff/notifikasi", label: "Notifikasi", icon: Bell },
];

export function DashboardShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isStaff = pathname.startsWith("/staff");
  const navigationLinks = isAdmin ? adminLinks : isStaff ? staffLinks : links;
  const page = navigationLinks.find((link) => link.href === pathname)?.label ?? (pathname.startsWith("/staff/mesin/") ? "Detail Kiosk" : pathname.startsWith("/dashboard/mesin/") ? "Detail Mesin" : pathname.startsWith("/admin/owner/") ? "Detail Owner" : "Dashboard");
  const basePath = isAdmin ? "/admin" : isStaff ? "/staff" : "/dashboard";

  return <SidebarProvider>
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="gap-3 p-4">
        <Link className="flex h-10 items-center gap-2 px-2 text-lg font-bold tracking-tight" href={basePath}>
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><Camera className="size-4" /></span>
          <span>SnapArcade</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? "Platform" : isStaff ? "Operasional" : "Workspace"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{navigationLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/admin" && href !== "/dashboard" && pathname.startsWith(`${href}/`));
              return <SidebarMenuItem key={href}><SidebarMenuButton render={<Link href={href} />} isActive={active} size="lg" tooltip={label}>
                <Icon aria-hidden="true" /><span>{label}</span>
              </SidebarMenuButton></SidebarMenuItem>;
            })}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-3">
        <div className="flex min-h-12 items-center gap-3 rounded-md px-2">
          <Avatar className="size-9"><AvatarFallback>SA</AvatarFallback></Avatar>
          <div className="min-w-0"><p className="truncate text-sm font-medium">SnapArcade</p><p className="text-xs text-muted-foreground">{isAdmin ? "Superadmin" : isStaff ? "Staff Operasional" : "Workspace Owner"}</p></div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
    <SidebarInset className="min-w-0">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
        <div className="flex min-w-0 items-center gap-3"><SidebarTrigger className="size-10" />
          <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href={basePath}>{isAdmin ? "Superadmin" : isStaff ? "Staff" : "Dashboard"}</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{page}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
        </div>
        <Link href={`${basePath}/notifikasi`} aria-label="Notifikasi" className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border hover:bg-muted"><Bell className="size-4" /></Link>
      </header>
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </SidebarInset>
  </SidebarProvider>;
}
