"use client";

import type { AppRouter } from "@flatsby/api";
import type { TRPCFailure } from "@flatsby/api/trpcFailure";
import type { QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchStreamLink,
  loggerLink,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import SuperJSON from "superjson";

import { trpcFailureCaches } from "@flatsby/api/trpcFailure";

import { env } from "~/env";
import { sendErrorReport } from "~/utils/error-beacon";
import { createQueryClient } from "./query-client";

let clientQueryClientSingleton: QueryClient | undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  } else {
    // Browser: use singleton pattern to keep the same query client
    // biome-ignore lint/suspicious/noAssignInExpressions: lazy singleton initialization
    return (clientQueryClientSingleton ??= createQueryClient(
      trpcFailureCaches(reportTRPCFailure),
    ));
  }
};

function reportTRPCFailure(error: Error, failure: TRPCFailure) {
  if (!failure.code && !navigator.onLine) return;
  sendErrorReport(error, "trpc", failure);
}

export const { useTRPC, TRPCProvider } = createTRPCContext<AppRouter>();

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: () => env.NODE_ENV === "development",
        }),
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: `${getBaseUrl()}/api/trpc`,
          headers() {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}

const getBaseUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  // biome-ignore lint/style/noProcessEnv: PORT is a runtime-only variable not part of the validated env schema
  return `http://localhost:${process.env.PORT ?? 3000}`;
};
