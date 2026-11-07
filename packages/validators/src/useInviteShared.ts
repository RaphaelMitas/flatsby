import { useSyncExternalStore } from "react";

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

export const useInviteSharedThisSession = (groupId: number) =>
  useSyncExternalStore(
    subscribe,
    () => sharedGroups.has(groupId),
    () => false,
  );
