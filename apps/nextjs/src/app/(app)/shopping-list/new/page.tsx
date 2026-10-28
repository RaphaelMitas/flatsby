import { getCurrentGroupId, getCurrentUserWithGroups } from "~/trpc/server";
import { FirstList } from "../FirstList";

export default async function NewShoppingListPage() {
  const groupId = await getCurrentGroupId();
  const userWithGroups = await getCurrentUserWithGroups();
  const groupName = userWithGroups.success
    ? (userWithGroups.data.user?.lastGroupUsed?.name ?? "")
    : "";

  return (
    <div className="mt-8 flex w-full flex-col">
      <FirstList groupId={groupId} groupName={groupName} isFirst={false} />
    </div>
  );
}
