"use client";

import { OrganizationSwitcher, TaskChooseOrganization } from "@clerk/nextjs";

/**
 * @see https://clerk.com/docs/nextjs/reference/components/authentication/task-choose-organization
 * `TaskChooseOrganization` renders when Clerk has a pending `choose-organization` session task.
 * `OrganizationSwitcher` covers the common case: signed in, no active org, no pending task.
 */
export function ChooseOrganizationClient() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center overflow-y-auto bg-gradient-to-b from-muted/45 via-background to-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Choose an organization</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select or create an organization to continue.
          </p>
        </div>
        <TaskChooseOrganization redirectUrlComplete="/" />
        <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Organization</p>
          <div className="flex flex-wrap justify-center gap-2">
            <OrganizationSwitcher
              hidePersonal
              afterSelectOrganizationUrl="/"
              afterCreateOrganizationUrl="/"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
