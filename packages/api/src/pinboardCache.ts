import type {
  CreatePinInput,
  Pin,
  UpdatePinInput,
} from "@flatsby/validators/pinboard";

import { PENDING_ID } from "./resultMutation";

type PinsPatch = (pins: Pin[]) => Pin[];

export const pinboardPatches = {
  create:
    ({ groupId: _groupId, ...pin }: CreatePinInput): PinsPatch =>
    (pins) => [...pins, { ...pin, id: PENDING_ID }],
  update:
    ({ groupId: _groupId, ...updated }: UpdatePinInput): PinsPatch =>
    (pins) =>
      pins.map((pin) => (pin.id === updated.id ? updated : pin)),
  remove:
    ({ id }: { id: number }): PinsPatch =>
    (pins) =>
      pins.filter((pin) => pin.id !== id),
};
