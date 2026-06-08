import path from "path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@mahara/core",
    "@mahara/db",
    "@mahara/matching",
    "@mahara/payments",
    "@mahara/notifications",
    "@mahara/verification",
  ],
  // Standalone mode for Docker — activated by NEXT_OUTPUT=standalone
  ...(process.env.NEXT_OUTPUT === "standalone" && {
    output: "standalone",
    // Trace files from the monorepo root so workspace packages are included
    outputFileTracingRoot: path.join(__dirname, "../../"),
  }),
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  webpack(config) {
    // Resolve NodeNext-style .js extension imports as .ts in monorepo packages
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
