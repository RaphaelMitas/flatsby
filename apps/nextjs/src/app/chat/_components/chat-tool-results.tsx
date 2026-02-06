"use client";

import type { ChatUIMessage } from "@flatsby/validators/chat/tools";
import {
  modifyDataOutputSchema,
  searchDataInputSchema,
  searchDataOutputSchema,
  showUIInputSchema,
  showUIOutputSchema,
} from "@flatsby/validators/chat/tools";
import { memo } from "react";

import { ModifyDataResult } from "./tool-results/modify-data-result";
import { SearchDataResult } from "./tool-results/search-data-result";
import { ShowUIResult } from "./tool-results/show-ui-result";

interface ChatToolResultsProps {
  message: ChatUIMessage;
  isLoading: boolean;
  onUIResponse: (
    componentId: string,
    response: { selectedIds?: string[]; confirmed?: boolean },
  ) => void;
}

const _ChatToolResults = ({
  message,
  isLoading,
  onUIResponse,
}: ChatToolResultsProps) => {
  const searchDataResults = message.parts.flatMap((part) => {
    if (part.type !== "tool-searchData" || part.state !== "output-available")
      return [];
    const output = searchDataOutputSchema.safeParse(part.output);
    const input = searchDataInputSchema.safeParse(part.input);
    if (!output.success || !input.success) return [];
    if (input.data.displayToUser === false) return [];
    return [{ toolCallId: part.toolCallId, output: output.data }];
  });

  const modifyDataResults = message.parts.flatMap((part) => {
    if (part.type !== "tool-modifyData" || part.state !== "output-available")
      return [];
    const output = modifyDataOutputSchema.safeParse(part.output);
    if (!output.success) return [];
    return [{ toolCallId: part.toolCallId, output: output.data }];
  });

  const showUIResults = message.parts.flatMap((part) => {
    if (part.type !== "tool-showUI" || part.state !== "output-available")
      return [];
    const output = showUIOutputSchema.safeParse(part.output);
    const input = showUIInputSchema.safeParse(part.input);
    if (!output.success || !input.success) return [];
    return [{ toolCallId: part.toolCallId, input: input.data, output: output.data }];
  });

  return (
    <>
      {searchDataResults.map((result) => (
        <SearchDataResult key={result.toolCallId} output={result.output} />
      ))}

      {modifyDataResults.map((result) => (
        <ModifyDataResult key={result.toolCallId} output={result.output} />
      ))}

      {showUIResults.map((result) => (
        <ShowUIResult
          key={result.toolCallId}
          input={result.input}
          output={result.output}
          disabled={isLoading}
          onUIResponse={onUIResponse}
        />
      ))}
    </>
  );
};

export const ChatToolResults = memo(_ChatToolResults);
