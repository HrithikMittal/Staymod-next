"use client";

import { OrganizationSwitcher, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/** Branding + auth for the home page only (no global top bar). */
export function HomeToolbar() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <div className="flex items-center justify-between gap-3 pb-6">
      <Link href="/" className="font-semibold tracking-tight">
        Staymod
      </Link>
      <div className="flex min-h-[2rem] items-center gap-3">
        {!isLoaded ? null : isSignedIn ? (
          <>
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl="/"
              afterSelectOrganizationUrl="/"
            />
            <UserButton />
          </>
        ) : (
          <>
            <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/sign-up">
              Sign up
            </Link>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/sign-in">
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
