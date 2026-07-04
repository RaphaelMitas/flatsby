import detoxGlobalSetup from "detox/runners/jest/globalSetup";

import { cleanupStaleE2eData } from "./helpers/api";

export default async function globalSetup() {
  await cleanupStaleE2eData();
  await detoxGlobalSetup();
}
