import { by, element } from "detox";

import { signInAsFreshUser } from "./session";

export { expect } from "detox";

export async function signIn(): Promise<void> {
  await signInAsFreshUser();
}

export async function getTestUserEmail(): Promise<string> {
  const attrs = await element(by.id("danger-user-email")).getAttributes();
  if ("text" in attrs && typeof attrs.text === "string") {
    return attrs.text;
  }
  if ("label" in attrs && typeof attrs.label === "string") {
    return attrs.label;
  }
  throw new Error("Could not read test user email from danger-user-email");
}
