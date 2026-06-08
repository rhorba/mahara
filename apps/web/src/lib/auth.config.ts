import type { Role } from "@mahara/core";
import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config — no Node.js native modules (argon2, postgres).
// Imported by middleware.ts. Full config with adapter + Credentials is in auth.ts.
export const authConfig = {
  providers: [],
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    newUser: "/auth/onboarding",
  },
  session: { strategy: "jwt" as const },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as { role?: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = (token.userId as string) ?? session.user.id;
      session.user.role = token.role as Role;
      return session;
    },
  },
} satisfies NextAuthConfig;
