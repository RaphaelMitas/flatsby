import type {
  CreatePinInput,
  Pin,
  UpdatePinInput,
} from "@flatsby/validators/pinboard";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { pinboardPatches } from "@flatsby/api/pinboardCache";
import { optimisticMutation } from "@flatsby/api/resultMutation";
import { pinFormOf } from "@flatsby/validators/pinboard";

import { trpc } from "~/utils/api";

export function usePinMutations(groupId: number) {
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

  const backToForm = (
    message: string | undefined,
    input: CreatePinInput | UpdatePinInput,
  ) => {
    Alert.alert(t("common.error"), message ?? t("pinboard.saveFailed"));
    router.push({
      pathname: "/(tabs)/home/pinboard/form",
      params: { ...pinFormOf(input), ...("id" in input && { id: input.id }) },
    });
  };

  return {
    create: useMutation(
      trpc.pinboard.create.mutationOptions(
        optimistic(pinboardPatches.create, backToForm),
      ),
    ),
    update: useMutation(
      trpc.pinboard.update.mutationOptions(
        optimistic(pinboardPatches.update, backToForm),
      ),
    ),
    remove: useMutation(
      trpc.pinboard.delete.mutationOptions(
        optimistic(pinboardPatches.remove, (message) =>
          Alert.alert(t("common.error"), message ?? t("pinboard.deleteFailed")),
        ),
      ),
    ),
  };
}
