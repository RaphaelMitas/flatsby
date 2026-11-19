import type {
  CreatePinInput,
  PinUse,
  UpdatePinInput,
} from "@flatsby/validators/pinboard";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { pinboardMutation, pinboardPatches } from "@flatsby/api/pinboardCache";
import { pinFormOf } from "@flatsby/validators/pinboard";

import { trpc } from "~/utils/api";

export function usePinMutations(groupId: number) {
  const queryClient = useQueryClient();
  const t = useTranslations();
  const pinsKey = trpc.pinboard.list.queryKey({ groupId });

  const backToForm = (
    message: string | undefined,
    input: CreatePinInput | UpdatePinInput,
  ) => {
    Alert.alert(t("common.error"), message ?? t("pinboard.saveFailed"));
    router.push({
      pathname: "/(tabs)/home/pinboard/form",
      params: pinFormOf(input),
    });
  };

  return {
    create: useMutation(
      trpc.pinboard.create.mutationOptions(
        pinboardMutation(queryClient, pinsKey, pinboardPatches.create, {
          onFailure: backToForm,
        }),
      ),
    ),
    update: useMutation(
      trpc.pinboard.update.mutationOptions(
        pinboardMutation(queryClient, pinsKey, pinboardPatches.update, {
          onFailure: backToForm,
        }),
      ),
    ),
    remove: useMutation(
      trpc.pinboard.delete.mutationOptions(
        pinboardMutation(queryClient, pinsKey, pinboardPatches.remove, {
          onFailure: (message) =>
            Alert.alert(
              t("common.error"),
              message ?? t("pinboard.deleteFailed"),
            ),
        }),
      ),
    ),
  };
}

export function useReportPinUse(groupId: number) {
  const { mutate } = useMutation(trpc.pinboard.reportUse.mutationOptions());
  return (use: PinUse) => mutate({ groupId, ...use });
}
