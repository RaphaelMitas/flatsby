import { by, element, waitFor } from "detox";

type Matcher = Parameters<typeof element>[0];

interface TapUntilVisibleOptions {
  timeout?: number;
  tapTimeout?: number;
  retries?: number;
  settleMs?: number;
}

interface SafeTapOptions {
  timeout?: number;
  retries?: number;
  settleMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits for a control to appear, then taps it until a follow-up screen/element
 * shows up. XCUITest can see a view before React Native has attached its press
 * handler (especially after navigation, modals, or while optimistic UI is still
 * disabled).
 */
export async function tapUntilVisible(
  tapMatcher: Matcher,
  resultMatcher: Matcher,
  {
    timeout = 15_000,
    tapTimeout = 3_000,
    retries = 10,
    settleMs = 400,
  }: TapUntilVisibleOptions = {},
): Promise<void> {
  const tapTarget = element(tapMatcher);
  const resultTarget = element(resultMatcher);

  await waitFor(tapTarget).toBeVisible().withTimeout(timeout);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await tapTarget.tap();
    } catch {
      await scrollToMatcher(tapMatcher);
      await tapTarget.tap();
    }
    try {
      await waitFor(resultTarget).toExist().withTimeout(tapTimeout);
      return;
    } catch {
      if (settleMs > 0) {
        await sleep(settleMs);
      }
    }
  }

  await waitFor(resultTarget).toExist().withTimeout(tapTimeout);
}

export async function tapIdUntilVisible(
  tapTestId: string,
  resultMatcher: Matcher,
  options?: TapUntilVisibleOptions,
): Promise<void> {
  await tapUntilVisible(by.id(tapTestId), resultMatcher, options);
}

/** Taps an element with retries when the handler may not be ready yet. */
export async function safeTap(
  matcher: Matcher,
  {
    timeout = 10_000,
    retries = 5,
    settleMs = 300,
  }: SafeTapOptions = {},
): Promise<void> {
  const target = element(matcher);
  await waitFor(target).toBeVisible().withTimeout(timeout);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await target.tap();
      return;
    } catch {
      if (settleMs > 0) {
        await sleep(settleMs);
      }
    }
  }

  await target.tap();
}

export async function safeTapId(
  testId: string,
  options?: SafeTapOptions,
): Promise<void> {
  await safeTap(by.id(testId), options);
}

export async function scrollToMatcher(matcher: Matcher): Promise<void> {
  const target = element(matcher);
  const scrollViews = [by.type("RCTScrollView"), by.type("UIScrollView")];

  for (const scrollMatcher of scrollViews) {
    try {
      await waitFor(target)
        .toBeVisible()
        .whileElement(scrollMatcher)
        .scroll(200, "down");
      return;
    } catch {
      // Try the next scroll container type.
    }
  }

  for (const scrollMatcher of scrollViews) {
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        await waitFor(target).toBeVisible(90).withTimeout(1_000);
        return;
      } catch {
        try {
          await element(scrollMatcher).atIndex(0).scroll(300, "down");
        } catch {
          break;
        }
      }
    }
  }
}

export async function tapWhenVisible(
  matcher: Matcher,
  options?: SafeTapOptions,
): Promise<void> {
  const { timeout = 10_000, retries = 5, settleMs = 300 } = options ?? {};
  const target = element(matcher);

  await waitFor(target).toBeVisible().withTimeout(timeout);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await target.tap();
      return;
    } catch {
      await scrollToMatcher(matcher);
      if (settleMs > 0) {
        await sleep(settleMs);
      }
    }
  }

  await target.tap();
}
