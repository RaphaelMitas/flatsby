"use client";

import type { QuizChoice } from "@flatsby/validators/chat/tools";
import { Check, HelpCircle } from "lucide-react";

import { Button } from "@flatsby/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@flatsby/ui/card";

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
      <Card className="my-2 max-w-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <HelpCircle className="size-4" />
            {question}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Check className="size-4 text-green-500" />
            Answered: {selectedLabel}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-2 max-w-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <HelpCircle className="size-4" />
          {question}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-2">
          {choices.map((choice) => (
            <Button
              key={choice.id}
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onAnswer(choice.id)}
              className="justify-start"
            >
              {choice.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
