import { AdminPage } from "@/components/admin-page";
import { loadDashboardData } from "@/lib/dashboard-data";
import { redirect } from "next/navigation";

export default async function Page() { const data = await loadDashboardData(); if (!data) redirect("/"); if (data.role !== "superadmin") redirect(data.role === "owner" ? "/dashboard" : "/staff"); return <AdminPage page="owners" data={data} />; }
