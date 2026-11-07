import { useSyncExternalStore } from "react";

import { hasJoined } from "./group";

// Module state, so a join that lands while the creator is still sending doesn't take the card away mid-send
const sharedGroups = new Set<number>();
const listeners = new Set<() => void>();

export const markInviteShared = (groupId: number) => {
  if (sharedGroups.has(groupId)) return;
  sharedGroups.add(groupId);
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The invite card shows while the creator is the only joined member, or after a share this session. */
export const useWaitingForFlatmates = (
  groupId: number,
  members: { userId: string | null }[] | undefined,
) => {
  const shared = useSyncExternalStore(
    subscribe,
    () => sharedGroups.has(groupId),
    () => false,
  );
  return (
    members !== undefined && (shared || members.filter(hasJoined).length === 1)
  );
};
