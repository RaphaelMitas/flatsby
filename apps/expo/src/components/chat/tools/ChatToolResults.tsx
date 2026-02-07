import type { ChatUIMessage } from "@flatsby/validators/chat/tools";
import { memo } from "react";
import { View } from "react-native";

import { ModifyDataResult } from "./ModifyDataResult";
import { SearchDataResult } from "./SearchDataResult";
import { ShowUIResult } from "./ShowUIResult";

interface ChatToolResultsProps {
  message: ChatUIMessage;
  isLoading: boolean;
  onUIResponse: (
    toolCallId: string,
    response: { selectedIds?: string[]; confirmed?: boolean },
  ) => void;
}

function _ChatToolResults({
  message,
  isLoading,
  onUIResponse,
}: ChatToolResultsProps) {
  return (
    <View className="mt-2 gap-2">
      {message.parts.map((part) => {
        // Search Data Results
        if (
          part.type === "tool-searchData" &&
          part.state === "output-available" &&
          part.input.displayToUser !== false
        ) {
          return (
            <SearchDataResult key={part.toolCallId} output={part.output} />
          );
        }

        // Modify Data Results
        if (
          part.type === "tool-modifyData" &&
          part.state === "output-available"
        ) {
          return (
            <ModifyDataResult key={part.toolCallId} output={part.output} />
          );
        }

        // Show UI Results
        if (part.type === "tool-showUI" && part.state === "output-available") {
          return (
            <ShowUIResult
              key={part.toolCallId}
              input={part.input}
              output={part.output}
              disabled={isLoading}
              onUIResponse={onUIResponse}
            />
          );
        }

        return null;
      })}
    </View>
  );
}

export const ChatToolResults = memo(_ChatToolResults);
