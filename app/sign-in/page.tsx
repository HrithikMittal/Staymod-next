import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AuthPageShell, CustomSignInForm } from "@/components/global";

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/");
  }

  return (
    <AuthPageShell
      title="Welcome back"
      subtitle="Sign in with email OTP to manage your properties and bookings."
    >
      <CustomSignInForm />
    </AuthPageShell>
  );
}
