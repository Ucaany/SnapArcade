import { OwnerPage } from "@/components/owner-page";
import { loadDashboardData } from "@/lib/dashboard-data";
import { notFound, redirect } from "next/navigation";

export default async function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadDashboardData();
  if (!data) redirect("/");
  if (data.role !== "owner") redirect(data.role === "superadmin" ? "/admin" : "/staff");
  if (!data.kiosks.some((kiosk) => kiosk.id === id)) notFound();
  return <OwnerPage page="machine-detail" machineId={id} data={data} />;
}
