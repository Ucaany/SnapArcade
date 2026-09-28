import { StaffPage } from "@/components/staff-page";
import { loadDashboardData } from "@/lib/dashboard-data";
import { notFound, redirect } from "next/navigation";

export default async function StaffMachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadDashboardData();
  if (!data) redirect("/");
  if (data.role !== "staff") redirect(data.role === "superadmin" ? "/admin" : "/dashboard");
  if (!data.kiosks.some((kiosk) => kiosk.id === id)) notFound();
  return <StaffPage page="machine" machineId={id} data={data} />;
}
