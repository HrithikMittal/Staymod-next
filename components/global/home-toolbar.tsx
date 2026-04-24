"use client";

import { OrganizationSwitcher, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/** Branding + auth for the home page only (no global top bar). */
export function HomeToolbar() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <div className="flex items-center justify-between gap-3 pb-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <Link href="/" className="inline-flex items-center gap-2 font-bold tracking-tight text-foreground">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            S
          </span>
          Staymod
        </Link>
        <Link
          href="/integration-guide"
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Integration guide
        </Link>
      </div>
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
