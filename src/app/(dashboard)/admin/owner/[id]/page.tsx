import { AdminPage } from "@/components/admin-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminPage page="owner-detail" ownerId={id} />;
}
