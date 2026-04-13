"use client";

import {
  OrganizationSwitcher,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export function AppHeader() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur">
      <span className="font-semibold tracking-tight">Staymod</span>
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
            <Link
              className={buttonVariants({ variant: "outline", size: "sm" })}
              href="/sign-in"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
