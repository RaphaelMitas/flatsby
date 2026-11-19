import { GroupGate } from "~/components/GroupGate";
import { Pinboard } from "~/components/pinboard/Pinboard";

export default function PinboardRoute() {
  return <GroupGate>{(group) => <Pinboard groupId={group.id} />}</GroupGate>;
}
