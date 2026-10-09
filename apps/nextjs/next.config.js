import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@flatsby/api",
    "@flatsby/auth",
    "@flatsby/db",
    "@flatsby/ui",
    "@flatsby/validators",
  ],
  reactCompiler: true,
  compiler: {
    reactRemoveProperties:
      process.env.E2E_TESTING !== "true"
        ? { properties: ["^data-testid$"] }
        : false,
  },

  images: {
    remotePatterns: [
      new URL(
        "https://raw.githubusercontent.com/RaphaelMitas/flatsby/assets/**",
      ),
    ],
  },
  // Markdown twins of the marketing pages, for AI agents.
  async rewrites() {
    return [
      { source: "/index.md", destination: "/md" },
      { source: "/:path(.+)\\.md", destination: "/md/:path" },
    ];
  },

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
};

export default config;
