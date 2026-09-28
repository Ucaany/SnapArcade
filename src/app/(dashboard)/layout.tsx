import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard-shell";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = { title: { default: "Dashboard | SnapArcade", template: "%s | SnapArcade" } };

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="dashboard-theme min-h-screen"><DashboardShell>{children}</DashboardShell><Toaster /></div>;
}
