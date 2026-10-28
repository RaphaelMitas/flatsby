import type { MemberPaymentDetailsInput } from "@flatsby/validators/payment";
import { useQuery } from "@tanstack/react-query";

import { paymentOptions } from "@flatsby/validators/payment";

import type { RouterOutputs } from "..";

type MemberPaymentDetails = RouterOutputs["group"]["getMemberPaymentDetails"];

export function usePaymentOptions<
  TOptions extends { queryKey: readonly unknown[] },
>(
  createQueryOptions: (input: MemberPaymentDetailsInput) => TOptions,
  groupId: number,
  receiverId: number,
  currency: string,
) {
  const { data } = useQuery<MemberPaymentDetails>({
    ...createQueryOptions({ groupId, groupMemberId: receiverId }),
    enabled: receiverId > 0,
    meta: { persist: false },
  });
  return data?.success ? paymentOptions(data.data, currency) : undefined;
}
