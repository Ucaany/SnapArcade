import { StaffPage } from "@/components/staff-page";

export default async function StaffMachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StaffPage page="machine" machineId={id} />;
}
