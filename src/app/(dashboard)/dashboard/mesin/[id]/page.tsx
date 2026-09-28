import { OwnerPage } from "@/components/owner-page";

export default async function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OwnerPage page="machine-detail" machineId={id} />;
}
