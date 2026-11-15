import { createJiti } from "jiti";
import createNextIntlPlugin from "next-intl/plugin";

const jiti = createJiti(import.meta.url);

await jiti.import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  transpilePackages: [
    "@flatsby/api",
    "@flatsby/auth",
    "@flatsby/db",
    "@flatsby/i18n",
    "@flatsby/ui",
    "@flatsby/validators",
  ],
  reactCompiler: true,
  experimental: { globalNotFound: true },
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
  async rewrites() {
    return [
      { source: "/index.md", destination: "/md" },
      { source: "/:path(.+)\\.md", destination: "/md/:path" },
    ];
  },

  typescript: { ignoreBuildErrors: true },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(config);
