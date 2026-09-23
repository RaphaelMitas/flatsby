import crypto from "node:crypto";
import { experimental_evaluate as evaluate, gateway } from "ai";

import type { TracingFeature } from "./model-provider";
import { captureError } from "../lib/posthog";
import { checkCredits, extractGatewayMetadata, trackAIUsage } from "./autumn";
import { captureGeneration } from "./model-provider";

export const CLASSIFICATION_MODEL = "typesafe-ai/jev";

// Below this probability Jev is guessing between neighbours, and "other" is
// the safer answer than a confident-looking wrong category.
const MIN_PROBABILITY = 0.4;

interface ClassifyOptions<K extends string> {
  userId: string;
  feature: TracingFeature;
  instructions: string;
  options: readonly { id: K; description: string }[];
  input: string;
  fallback: K;
}

export async function classify<K extends string>({
  userId,
  feature,
  instructions,
  options,
  input,
  fallback,
}: ClassifyOptions<K>): Promise<K> {
  const { allowed } = await checkCredits({ customerId: userId });
  if (!allowed) return fallback;

  const tracing = {
    distinctId: userId,
    traceId: crypto.randomUUID(),
    feature,
  };
  const startTime = Date.now();
  const ids = new Set<string>(options.map((option) => option.id));
  const isOption = (value: string): value is K => ids.has(value);

  try {
    const result = await evaluate({
      model: gateway.evaluationModel(CLASSIFICATION_MODEL),
      state: input,
      questions: {
        category: {
          type: "choice",
          instructions,
          criteria: Object.fromEntries(
            options.map((option) => [option.id, option.description]),
          ),
        },
      },
    });

    const answer = result.answers.category;
    const probability = answer.probabilities?.[answer.choice] ?? 1;

    captureGeneration({
      tracing,
      model: CLASSIFICATION_MODEL,
      input,
      output: { choice: answer.choice, probability },
      latencySeconds: (Date.now() - startTime) / 1000,
    });

    try {
      await trackAIUsage({
        customerId: userId,
        cost: extractGatewayMetadata(result.providerMetadata)?.cost,
      });
    } catch (trackingError) {
      captureError({
        error: trackingError,
        operation: `track-${feature}-usage`,
        distinctId: userId,
      });
    }

    if (isOption(answer.choice) && probability >= MIN_PROBABILITY) {
      return answer.choice;
    }
  } catch (error) {
    captureGeneration({
      tracing,
      model: CLASSIFICATION_MODEL,
      input,
      output: null,
      error,
      latencySeconds: (Date.now() - startTime) / 1000,
    });
    captureError({ error, operation: feature, distinctId: userId });
  }
  return fallback;
}
