import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AuthPageShell, CustomSignUpForm } from "@/components/global";

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/");
  }

  return (
    <AuthPageShell
      title="Create your account"
      subtitle="Sign up with email and verify using OTP."
    >
      <CustomSignUpForm />
    </AuthPageShell>
  );
}
