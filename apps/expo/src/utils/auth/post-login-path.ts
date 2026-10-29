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

// A module flag, set before the root layout leaves the code screen; a pending invite path waits until the name step is done
let namePending = false;

export const askForName = () => {
  namePending = true;
};

export const nameStepPending = () => namePending;

export const finishNameStep = () => {
  namePending = false;
};
