"use client";

import type {
  CreatePinInput,
  Pin,
  PinFormValues,
  UpdatePinInput,
} from "@flatsby/validators/pinboard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { pinboardPatches } from "@flatsby/api/pinboardCache";
import { optimisticMutation } from "@flatsby/api/resultMutation";
import { toast } from "@flatsby/ui/toast";
import { pinFormOf } from "@flatsby/validators/pinboard";

import { useTRPC } from "~/trpc/react";

export type PinDraft = PinFormValues & { id?: number };

export function usePinMutations(
  groupId: number,
  backToForm: (draft: PinDraft) => void,
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const t = useTranslations();
  const pinsKey = trpc.pinboard.list.queryKey({ groupId });

  const optimistic = <TInput>(
    patchFor: (input: TInput) => (pins: Pin[]) => Pin[],
    onFailure: (message: string | undefined, input: TInput) => void,
  ) =>
    optimisticMutation<unknown, TInput, Pin[]>(queryClient, pinsKey, patchFor, {
      onFailure,
    });

  const saveFailed = (
    message: string | undefined,
    input: CreatePinInput | UpdatePinInput,
  ) => {
    toast.error(message ?? t("pinboard.saveFailed"));
    backToForm({ ...pinFormOf(input), ...("id" in input && { id: input.id }) });
  };

  return {
    create: useMutation(
      trpc.pinboard.create.mutationOptions(
        optimistic(pinboardPatches.create, saveFailed),
      ),
    ),
    update: useMutation(
      trpc.pinboard.update.mutationOptions(
        optimistic(pinboardPatches.update, saveFailed),
      ),
    ),
    remove: useMutation(
      trpc.pinboard.delete.mutationOptions(
        optimistic(pinboardPatches.remove, (message) =>
          toast.error(message ?? t("pinboard.deleteFailed")),
        ),
      ),
    ),
  };
}
