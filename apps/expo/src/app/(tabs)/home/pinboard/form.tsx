import { useLocalSearchParams } from "expo-router";

import { pinIconSchema } from "@flatsby/validators/pinboard";

import { GroupGate } from "~/components/GroupGate";
import { PinForm } from "~/components/pinboard/PinForm";

export default function PinFormRoute() {
  const { id, title, body, icon, ssid, password } = useLocalSearchParams<{
    id?: string;
    title?: string;
    body?: string;
    icon?: string;
    ssid?: string;
    password?: string;
  }>();

  return (
    <GroupGate>
      {(group) => (
        <PinForm
          groupId={group.id}
          pinId={id === undefined ? undefined : Number(id)}
          draft={{
            title,
            body,
            ssid,
            password,
            icon: pinIconSchema.safeParse(icon).data,
          }}
        />
      )}
    </GroupGate>
  );
}
