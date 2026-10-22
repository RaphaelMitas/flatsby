import type { Href } from "expo-router";

// Module state, not a route param: sign-in can land on the bare index route, which then redirects to it
let pending: Href | null = null;

export const rememberPostLoginPath = (path: Href) => {
  pending = path;
};

export const peekPostLoginPath = () => pending;

export const clearPostLoginPath = () => {
  pending = null;
};
