import { SplitDashboard } from "./SplitDashboard";

export default async function SplitPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <SplitDashboard groupId={parseInt(groupId)} />;
}
