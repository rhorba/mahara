import { routing } from "@/i18n/routing";
import { authConfig } from "@/lib/auth.config";
import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge-safe auth instance — uses only authConfig (no argon2, no DB connection)
const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

const protectedPatterns = [
  /^\/[a-z]{2}\/(talent)\//,
  /^\/[a-z]{2}\/(business)\//,
  /^\/[a-z]{2}\/(admin)\//,
];

export default auth((req) => {
  const isProtected = protectedPatterns.some((p) => p.test(req.nextUrl.pathname));

  if (isProtected && !req.auth) {
    const locale = req.nextUrl.pathname.split("/")[1] ?? "fr";
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, req.url));
  }

  return intlMiddleware(req as unknown as NextRequest);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
