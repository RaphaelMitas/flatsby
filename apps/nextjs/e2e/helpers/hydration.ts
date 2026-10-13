import type { Locator } from "@playwright/test";
import { expect } from "@playwright/test";

// Server-rendered elements are visible before React attaches their handlers,
// and a click or fill that lands in that window is lost for good.
export async function waitForHydration(locator: Locator) {
  await expect
    .poll(() =>
      locator.evaluate((element) =>
        Object.keys(element).some((key) => key.startsWith("__reactProps$")),
      ),
    )
    .toBe(true);
}
