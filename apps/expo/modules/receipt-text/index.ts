import type { ReceiptTextLine } from "@flatsby/validators/expenses/receipt-scan";
import { requireOptionalNativeModule } from "expo";

import { receiptTextLineSchema } from "@flatsby/validators/expenses/receipt-scan";

const ReceiptText = requireOptionalNativeModule<{
  recognizeLines(uri: string): Promise<unknown>;
}>("ReceiptText");

export async function recognizeLines(uri: string): Promise<ReceiptTextLine[]> {
  if (!ReceiptText) return [];
  const lines = receiptTextLineSchema
    .array()
    .safeParse(await ReceiptText.recognizeLines(uri).catch(() => []));
  return lines.success ? lines.data : [];
}
