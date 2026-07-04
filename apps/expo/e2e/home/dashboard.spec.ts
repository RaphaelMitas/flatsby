import { by, element, expect } from "detox";

import { signIn } from "../fixtures/auth";

describe("Authenticated dashboard", () => {
  it("redirects authenticated user from / to /home or /group", async () => {
    await signIn();

    await expect(element(by.text("Your Groups"))).toBeVisible();
    await expect(element(by.id("groups-create-group-button"))).toBeVisible();
  });

  it("authenticated user does not see landing page", async () => {
    await signIn();

    await expect(element(by.id("login-screen"))).not.toBeVisible();
  });
});
