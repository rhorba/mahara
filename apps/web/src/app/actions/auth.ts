"use server";

import { signIn, signOut } from "@/lib/auth";
import { signupSchema } from "@mahara/core";
import { db, users } from "@mahara/db";
import { sendWelcomeEmail } from "@mahara/notifications/email";
import * as argon2 from "argon2";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

type ActionState = { error?: string } | null;

function dashboardPath(locale: string, role: string): string {
  if (role === "business") return `/${locale}/business/dashboard`;
  if (role === "admin") return `/${locale}/admin/dashboard`;
  return `/${locale}/talent/dashboard`;
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    role: formData.get("role"),
    city: formData.get("city") || undefined,
    phone: formData.get("phone") || undefined,
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }

  const { email, password, name, role, city, phone } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return { error: "Cet email est déjà utilisé" };
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  await db.insert(users).values({
    email,
    name,
    role,
    city: city ?? null,
    phone: phone ?? null,
    passwordHash,
    isActive: true,
  });

  // Fire-and-forget welcome email — never block signup on email failure
  sendWelcomeEmail(email, name, role as "talent" | "business").catch(() => null);

  const locale = await getLocale();

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: dashboardPath(locale, role),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Inscription réussie mais connexion échouée. Connectez-vous." };
    }
    throw err; // Re-throw NEXT_REDIRECT — Next.js needs this
  }

  return null;
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = await getLocale();

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: `/${locale}/auth/redirect`,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Email ou mot de passe incorrect" };
    }
    throw err; // Re-throw NEXT_REDIRECT
  }

  return null;
}

export async function signOutAction(): Promise<void> {
  const locale = await getLocale();
  await signOut({ redirectTo: `/${locale}` });
}

export async function googleSignInAction(): Promise<void> {
  const locale = await getLocale();
  await signIn("google", { redirectTo: `/${locale}/auth/redirect` });
}
