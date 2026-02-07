import type { QuizChoice } from "@flatsby/validators/chat/tools";
import { Text, View } from "react-native";

import { Button } from "~/lib/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";

interface UIQuizProps {
  question: string;
  choices: QuizChoice[];
  disabled?: boolean;
  onAnswer: (choiceId: string) => void;
  hasResponded?: boolean;
  previousResponse?: string;
}

export function UIQuiz({
  question,
  choices,
  disabled = false,
  onAnswer,
  hasResponded = false,
  previousResponse,
}: UIQuizProps) {
  // Show read-only state if already responded
  if (hasResponded && previousResponse) {
    const selectedLabel = choices.find((c) => c.id === previousResponse)?.label;

    return (
      <Card className="my-2">
        <CardHeader className="pb-2">
          <View className="flex-row items-center gap-2">
            <Icon name="message-square-more" size={16} color="foreground" />
            <CardTitle className="text-sm font-medium">{question}</CardTitle>
          </View>
        </CardHeader>
        <CardContent className="pt-0">
          <View className="flex-row items-center gap-2">
            <Icon name="check" size={16} color="success" />
            <Text className="text-muted-foreground text-sm">
              Answered: {selectedLabel}
            </Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-2">
      <CardHeader className="pb-2">
        <View className="flex-row items-center gap-2">
          <Icon name="message-square-more" size={16} color="foreground" />
          <CardTitle className="text-sm font-medium">{question}</CardTitle>
        </View>
      </CardHeader>
      <CardContent className="pt-0">
        <View className="gap-2">
          {choices.map((choice) => (
            <Button
              key={choice.id}
              variant="outline"
              size="sm"
              disabled={disabled}
              onPress={() => onAnswer(choice.id)}
              title={choice.label}
              className="justify-start"
            />
          ))}
        </View>
      </CardContent>
    </Card>
  );
}
