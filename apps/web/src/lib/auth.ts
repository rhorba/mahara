import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { loginSchema } from "@mahara/core";
import type { Role } from "@mahara/core";
import { accounts, db, sessions, users, verificationTokens } from "@mahara/db";
import * as argon2 from "argon2";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    // Google: role defaults to "talent"; changed during onboarding
    Google({
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name as string,
          email: profile.email as string,
          image: profile.picture as string | undefined,
          role: "talent" as Role,
        };
      },
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        // Reject OAuth-only accounts (no password hash) and deactivated users
        if (!user?.passwordHash || !user.isActive) return null;

        const valid = await argon2.verify(user.passwordHash, password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
});
