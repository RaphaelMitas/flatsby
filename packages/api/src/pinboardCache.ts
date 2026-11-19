import type {
  CreatePinInput,
  Pin,
  UpdatePinInput,
} from "@flatsby/validators/pinboard";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

import type { OptimisticOptions } from "./resultMutation";
import { optimisticMutation, temporaryId } from "./resultMutation";

type PinsPatch = (pins: Pin[]) => Pin[];

export const pinboardPatches = {
  create:
    ({ groupId: _groupId, ...pin }: CreatePinInput): PinsPatch =>
    (pins) => [...pins, { ...pin, id: temporaryId() }],
  update:
    ({ groupId: _groupId, ...updated }: UpdatePinInput): PinsPatch =>
    (pins) =>
      pins.map((pin) => (pin.id === updated.id ? updated : pin)),
  remove:
    ({ id }: { id: number }): PinsPatch =>
    (pins) =>
      pins.filter((pin) => pin.id !== id),
};

export const pinboardMutation = <TData, TInput>(
  queryClient: QueryClient,
  pinsKey: QueryKey,
  patchFor: (input: TInput) => PinsPatch,
  options: OptimisticOptions<TData, TInput>,
) =>
  optimisticMutation<TData, TInput, Pin[]>(
    queryClient,
    pinsKey,
    patchFor,
    options,
  );
