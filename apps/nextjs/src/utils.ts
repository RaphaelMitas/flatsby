import type { ApiErrorResult } from "@flatsby/api";
import { redirect } from "next/navigation";

import { signOut } from "./auth/client";

export const handleApiError = (error: ApiErrorResult["error"]) => {
  if (error.type === "UnauthorizedError") {
    void signOut();
    redirect("/auth/login");
  }
  return null;
};
