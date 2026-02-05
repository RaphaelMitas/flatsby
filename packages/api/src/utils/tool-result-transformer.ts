import type {
  ModifyDataAction,
  ModifyDataEntity,
  ModifyDataOutput,
} from "@flatsby/validators/chat/tools";

import type { ApiResult } from "../errors";

/**
 * Transform an ApiResult from a tRPC procedure to a ModifyDataOutput.
 * This provides a consistent way to convert router results to tool output format.
 */
export function handleApiResult<T>(
  result: ApiResult<T>,
  action: ModifyDataAction,
  entity: ModifyDataEntity,
  transformSuccess: (data: T) => ModifyDataOutput,
): ModifyDataOutput {
  if (!result.success) {
    return {
      success: false,
      action,
      entity,
      error: result.error.message,
    };
  }
  return transformSuccess(result.data);
}
