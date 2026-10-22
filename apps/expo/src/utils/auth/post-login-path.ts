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
