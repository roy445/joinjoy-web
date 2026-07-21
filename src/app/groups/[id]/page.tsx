import { GroupDetailClient } from "@/components/group-detail-client";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupDetailClient id={id} />;
}