import { AdminPage } from "@/components/admin-page";
import { loadDashboardData } from "@/lib/dashboard-data";
import { notFound, redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadDashboardData();
  if (!data) redirect("/");
  if (data.role !== "superadmin") redirect(data.role === "owner" ? "/dashboard" : "/staff");
  if (!data.owners.some((owner) => owner.id === id)) notFound();
  return <AdminPage page="owner-detail" ownerId={id} data={data} />;
}
