import path from "path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProd = process.env.NODE_ENV === "production";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Derive allowed origins for server actions
const allowedOrigins = ["localhost:3000"];
try {
  const url = new URL(appUrl);
  if (!allowedOrigins.includes(url.host)) allowedOrigins.push(url.host);
} catch {
  // invalid URL — keep localhost only
}

const securityHeaders = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Block MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer: send origin only cross-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict sensitive browser APIs
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  // HSTS — production only (don't force HTTPS in dev)
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  // Partial CSP — targets the most critical attack vectors without breaking Next.js.
  // Full nonce-based CSP is planned for a later hardening pass.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js App Router needs 'unsafe-inline' + 'unsafe-eval' for hydration chunks.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Tailwind v4 injects styles dynamically.
      "style-src 'self' 'unsafe-inline'",
      // Images: self + R2 CDN + Google OAuth avatars + data URIs for icons.
      "img-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://lh3.googleusercontent.com",
      // Fonts: self only (DM Sans / Sora / Noto via CSS vars, no external CDN).
      "font-src 'self'",
      // API calls: self + Resend (email receipt pixel, if any).
      "connect-src 'self'",
      // Blocks <object>, <embed>, <applet>.
      "object-src 'none'",
      // Blocks <base> tag hijacking.
      "base-uri 'self'",
      // Forms must submit to same origin.
      "form-action 'self'",
      // Blocks this page being embedded in any frame — stronger than X-Frame-Options.
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

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
      allowedOrigins,
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
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
