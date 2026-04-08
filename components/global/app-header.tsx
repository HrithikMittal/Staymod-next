"use client";

import {
  OrganizationSwitcher,
  SignInButton,
  UserButton,
  useAuth,
} from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export function AppHeader() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
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
          <SignInButton mode="modal">
            <Button variant="outline" size="sm">
              Sign in
            </Button>
          </SignInButton>
        )}
      </div>
    </header>
  );
}
