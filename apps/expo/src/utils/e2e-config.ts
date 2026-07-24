import * as SecureStore from "expo-secure-store";

let memoConfig: { apiUrl: string; bypass?: string } | null = null;

export const isE2EBuild = (): boolean =>
  process.env.EXPO_PUBLIC_E2E_TESTING === "true";

export const setE2EConfig = async (config: {
  apiUrl: string;
  bypass?: string;
}): Promise<void> => {
  if (!isE2EBuild()) {
    return;
  }
  await SecureStore.setItemAsync("flatsby_e2e_config", JSON.stringify(config));
  memoConfig = config;
};

const validateE2EConfig = (
  value: unknown,
): value is { apiUrl: string; bypass?: string } => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("apiUrl" in value)) {
    return false;
  }
  return typeof value.apiUrl === "string";
};

export const getE2EConfig = (): { apiUrl: string; bypass?: string } | null => {
  if (!isE2EBuild()) {
    return null;
  }
  if (memoConfig !== null) {
    return memoConfig;
  }
  try {
    const value = SecureStore.getItem("flatsby_e2e_config");
    if (value === null) {
      memoConfig = null;
      return null;
    }
    const parsed: unknown = JSON.parse(value);
    if (!validateE2EConfig(parsed)) {
      memoConfig = null;
      return null;
    }
    memoConfig = parsed;
    return memoConfig;
  } catch {
    memoConfig = null;
    return null;
  }
};

export const getE2EHeaders = (): Record<string, string> => {
  const config = getE2EConfig();
  if (config?.bypass !== undefined) {
    return { "x-vercel-protection-bypass": config.bypass };
  }
  return {};
};
