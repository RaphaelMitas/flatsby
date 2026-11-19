import type { PinIcon } from "@flatsby/validators/pinboard";
import type { LucideIcon } from "lucide-react";
import {
  KeyRound,
  Phone,
  Pin,
  ScrollText,
  Trash2,
  WashingMachine,
  Wifi,
  Zap,
} from "lucide-react";

export const pinIconComponents = {
  pin: Pin,
  wifi: Wifi,
  "key-round": KeyRound,
  phone: Phone,
  "trash-2": Trash2,
  "scroll-text": ScrollText,
  "washing-machine": WashingMachine,
  zap: Zap,
} satisfies Record<PinIcon, LucideIcon>;

export function PinIconBadge({ icon }: { icon: PinIcon }) {
  const Glyph = pinIconComponents[icon];

  return (
    <span className="bg-muted grid size-10 shrink-0 place-items-center rounded-full">
      <Glyph className="size-4.5" />
    </span>
  );
}
