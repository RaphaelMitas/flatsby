import type { ApiErrorResult } from "@flatsby/api";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { signOutAndRedirect } from "./auth/client";

export function useHandleApiError() {
  const router = useRouter();

  return useCallback(
    (error: ApiErrorResult["error"]) => {
      if (error.type === "UnauthorizedError") {
        void signOutAndRedirect(router);
      }
      return null;
    },
    [router],
  );
}
