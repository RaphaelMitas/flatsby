import type { Href } from "expo-router";

// Module state, not a route param: on iOS the sign-in session swallows the callback URL and the stack remounts at the index route
let pending: Href | null = null;

export const rememberPostLoginPath = (path: Href) => {
  pending = path;
};

export const peekPostLoginPath = () => pending;

export const clearPostLoginPath = () => {
  pending = null;
};

export type SignInStep = "name" | "passkey";

// Not a route param: the root layout leaves the code screen on its own once the session lands
let steps: SignInStep[] = [];

export const queueSignInSteps = (next: SignInStep[]) => {
  steps = next;
};

export const nextSignInStep = () => steps[0] ?? null;

export const finishSignInStep = (step: SignInStep) => {
  steps = steps.filter((pending) => pending !== step);
};

export const clearSignInSteps = () => {
  steps = [];
};
