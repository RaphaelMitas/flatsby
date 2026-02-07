import type { ShowUIInput, ShowUIOutput } from "@flatsby/validators/chat/tools";
import { Text, View } from "react-native";

import Icon from "~/lib/ui/custom/icons/Icon";
import { UIChart } from "./UIChart";
import { UIConfirmation } from "./UIConfirmation";
import { UIQuiz } from "./UIQuiz";
import { UISelector } from "./UISelector";
import { UITable } from "./UITable";

interface ShowUIResultProps {
  input: ShowUIInput;
  output: ShowUIOutput;
  disabled?: boolean;
  onUIResponse: (
    componentId: string,
    response: { selectedIds?: string[]; confirmed?: boolean },
  ) => void;
}

export function ShowUIResult({
  input,
  output,
  disabled = false,
  onUIResponse,
}: ShowUIResultProps) {
  const { component, config } = input;
  const componentId = output.componentId ?? "unknown";
  const hasResponded = !output.awaitingInput;
  const userResponse = output.userResponse;

  // Handle pending state
  if (!output.rendered) {
    return (
      <View className="my-2 flex-row items-center gap-2">
        <Icon name="loader" size={16} color="muted-foreground" />
        <Text className="text-muted-foreground text-sm">Loading...</Text>
      </View>
    );
  }

  switch (component) {
    case "selector":
      if (!config.options || config.options.length === 0) {
        return null;
      }
      return (
        <UISelector
          title={config.title}
          options={config.options}
          multiSelect={config.multiSelect}
          disabled={disabled}
          onSelect={(selectedIds) => onUIResponse(componentId, { selectedIds })}
          hasResponded={hasResponded}
          previousResponse={userResponse?.selectedIds}
        />
      );

    case "quiz":
      if (!config.question || !config.choices || config.choices.length === 0) {
        return null;
      }
      return (
        <UIQuiz
          question={config.question}
          choices={config.choices}
          disabled={disabled}
          onAnswer={(choiceId) =>
            onUIResponse(componentId, { selectedIds: [choiceId] })
          }
          hasResponded={hasResponded}
          previousResponse={userResponse?.selectedIds?.[0]}
        />
      );

    case "chart":
      if (!config.chartType || !config.data || config.data.length === 0) {
        return null;
      }
      return (
        <UIChart
          chartType={config.chartType}
          title={config.title}
          data={config.data}
        />
      );

    case "table":
      if (
        !config.columns ||
        config.columns.length === 0 ||
        !config.rows ||
        config.rows.length === 0
      ) {
        return null;
      }
      return (
        <UITable
          title={config.title}
          columns={config.columns}
          rows={config.rows}
        />
      );

    case "confirmation":
      if (!config.message) {
        return null;
      }
      return (
        <UIConfirmation
          title={config.title}
          message={config.message}
          confirmLabel={config.confirmLabel}
          cancelLabel={config.cancelLabel}
          destructive={config.destructive}
          disabled={disabled}
          onConfirm={() => onUIResponse(componentId, { confirmed: true })}
          onCancel={() => onUIResponse(componentId, { confirmed: false })}
          hasResponded={hasResponded}
          wasConfirmed={userResponse?.confirmed}
        />
      );

    default:
      return null;
  }
}
