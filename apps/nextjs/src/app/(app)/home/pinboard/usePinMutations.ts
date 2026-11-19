"use client";

import type {
  CreatePinInput,
  PinDraft,
  UpdatePinInput,
} from "@flatsby/validators/pinboard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { pinboardMutation, pinboardPatches } from "@flatsby/api/pinboardCache";
import { toast } from "@flatsby/ui/toast";
import { pinDraftOf } from "@flatsby/validators/pinboard";

import { useTRPC } from "~/trpc/react";

export function usePinMutations(
  groupId: number,
  backToForm: (draft: PinDraft) => void,
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const t = useTranslations();
  const pinsKey = trpc.pinboard.list.queryKey({ groupId });

  const saveFailed = (
    message: string | undefined,
    input: CreatePinInput | UpdatePinInput,
  ) => {
    toast.error(message ?? t("pinboard.saveFailed"));
    backToForm(pinDraftOf(input));
  };

  return {
    create: useMutation(
      trpc.pinboard.create.mutationOptions(
        pinboardMutation(queryClient, pinsKey, pinboardPatches.create, {
          onFailure: saveFailed,
        }),
      ),
    ),
    update: useMutation(
      trpc.pinboard.update.mutationOptions(
        pinboardMutation(queryClient, pinsKey, pinboardPatches.update, {
          onFailure: saveFailed,
        }),
      ),
    ),
    remove: useMutation(
      trpc.pinboard.delete.mutationOptions(
        pinboardMutation(queryClient, pinsKey, pinboardPatches.remove, {
          onFailure: (message) =>
            toast.error(message ?? t("pinboard.deleteFailed")),
        }),
      ),
    ),
  };
}
