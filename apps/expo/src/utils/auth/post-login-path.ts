import type { Href } from "expo-router";

let pending: Href | null = null;

export const rememberPostLoginPath = (path: Href) => {
  pending = path;
};

export const peekPostLoginPath = () => pending;

export const clearPostLoginPath = () => {
  pending = null;
};

export type SignInStep = "name" | "passkey";

let steps: SignInStep[] = [];

export const queueSignInSteps = (next: SignInStep[]) => {
  steps = next;
};

export const nextSignInStep = () => steps[0] ?? null;

export const finishSignInStep = (step: SignInStep) => {
  steps = steps.filter((pending) => pending !== step);
};
