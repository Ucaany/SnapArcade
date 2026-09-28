import { StaffPage } from "@/components/staff-page";
import { loadDashboardData } from "@/lib/dashboard-data";
import { redirect } from "next/navigation";

export default async function StaffHardwarePage() { const data = await loadDashboardData(); if (!data) redirect("/"); if (data.role !== "staff") redirect(data.role === "superadmin" ? "/admin" : "/dashboard"); return <StaffPage page="hardware" data={data} />; }
