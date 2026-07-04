import { by, element, waitFor } from "detox";

type Matcher = Parameters<typeof element>[0];

interface TapUntilVisibleOptions {
  timeout?: number;
  tapTimeout?: number;
  retries?: number;
}

/**
 * Waits for a control to appear, then taps it until a follow-up screen/element
 * shows up. Needed while detoxEnableSynchronization is off: XCUITest can see a
 * view before React Native has attached its press handler (especially after
 * navigation or modal presentation).
 */
export async function tapUntilVisible(
  tapMatcher: Matcher,
  resultMatcher: Matcher,
  {
    timeout = 15_000,
    tapTimeout = 2_000,
    retries = 5,
  }: TapUntilVisibleOptions = {},
): Promise<void> {
  const tapTarget = element(tapMatcher);
  const resultTarget = element(resultMatcher);

  await waitFor(tapTarget).toExist().withTimeout(timeout);

  for (let attempt = 0; attempt < retries; attempt++) {
    await tapTarget.tap();
    try {
      await waitFor(resultTarget).toExist().withTimeout(tapTimeout);
      return;
    } catch {
      // Press handler may not be ready yet — retry.
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
