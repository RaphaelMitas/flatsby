import type { TRPCFailure } from "@flatsby/api/trpcFailure";
import { getNetworkStateAsync, NetworkStateType } from "expo-network";

import { trpcFailureProperties } from "@flatsby/api/trpcFailure";

import { getPostHog } from "./analytics/posthog";

export function reportTRPCFailure(error: Error, failure: TRPCFailure) {
  void getNetworkStateAsync()
    .catch(() => undefined)
    .then((network) => {
      if (!failure.code && network?.isInternetReachable === false) return;
      getPostHog().captureException(error, {
        ...trpcFailureProperties(failure),
        network_type: network?.type ?? NetworkStateType.UNKNOWN,
      });
    });
}
