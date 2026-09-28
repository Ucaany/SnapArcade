import { OwnerPage } from "@/components/owner-page";
import { loadDashboardData } from "@/lib/dashboard-data";
import { redirect } from "next/navigation";

export default async function SettingsPage() { const data = await loadDashboardData(); if (!data) redirect("/"); if (data.role !== "owner") redirect(data.role === "superadmin" ? "/admin" : "/staff"); return <OwnerPage page="settings" data={data} />; }
