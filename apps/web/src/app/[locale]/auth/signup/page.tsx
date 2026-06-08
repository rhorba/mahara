import { SignupForm } from "@/components/auth/signup-form";

type Props = {
  searchParams: Promise<{ role?: string }>;
};

export default async function SignupPage({ searchParams }: Props) {
  const { role } = await searchParams;
  const defaultRole = role === "business" ? "business" : "talent";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <SignupForm defaultRole={defaultRole} />
      </div>
    </main>
  );
}
