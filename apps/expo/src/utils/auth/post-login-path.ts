import type { Href } from "expo-router";

// Module state, not a route param: the sign-in callback URL only ever points at the index route
let pending: Href | null = null;

export const rememberPostLoginPath = (path: Href) => {
  pending = path;
};

export const peekPostLoginPath = () => pending;

export const clearPostLoginPath = () => {
  pending = null;
};
