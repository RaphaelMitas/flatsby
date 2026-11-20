import { GroupGate } from "~/components/GroupGate";
import { Pinboard } from "~/components/pinboard/Pinboard";
import { SafeAreaView } from "~/lib/ui/safe-area";

export default function PinboardRoute() {
  return (
    <SafeAreaView edges={[]}>
      <GroupGate>{(group) => <Pinboard groupId={group.id} />}</GroupGate>
    </SafeAreaView>
  );
}
