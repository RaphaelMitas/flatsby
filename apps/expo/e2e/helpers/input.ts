import { by, element, waitFor } from "detox";

async function scrollToInput(testId: string): Promise<void> {
  const input = element(by.id(testId));
  const scrollViews = [by.type("RCTScrollView"), by.type("UIScrollView")];

  for (const scrollMatcher of scrollViews) {
    try {
      await waitFor(input)
        .toExist()
        .whileElement(scrollMatcher)
        .scroll(120, "down");
      return;
    } catch {
      // Try the next scroll container type.
    }
  }
}

export async function fillInput(testId: string, text: string): Promise<void> {
  const input = element(by.id(testId));
  await waitFor(input).toExist().withTimeout(15_000);

  try {
    await input.replaceText(text);
    return;
  } catch {
    await scrollToInput(testId);
    await input.replaceText(text);
  }
}

export async function dismissKeyboard(): Promise<void> {
  try {
    await element(by.label("Return")).tap();
  } catch {
    // Keyboard may already be dismissed.
  }
}
