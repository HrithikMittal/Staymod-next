"use client";

import { UserButton, useUser } from "@clerk/nextjs";

const userButtonAppearance = {
  elements: {
    userButtonBox: "flex shrink-0 items-center",
    userButtonTrigger:
      "flex size-8 items-center justify-center rounded-full ring-1 ring-border/50 ring-offset-2 ring-offset-sidebar transition-shadow hover:ring-border",
    userButtonAvatarBox: "size-8",
  },
};

function displayName(user: NonNullable<ReturnType<typeof useUser>["user"]>) {
  if (user.fullName?.trim()) return user.fullName.trim();
  const fromParts = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fromParts) return fromParts;
  if (user.username) return user.username;
  return "Account";
}

function primaryEmail(user: NonNullable<ReturnType<typeof useUser>["user"]>) {
  return (
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    ""
  );
}

export function PropertySidebarFooter() {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) {
    return null;
  }

  const name = displayName(user);
  const email = primaryEmail(user);

  return (
    <div className="shrink-0 border-sidebar-border border-t pr-2 pl-3 pt-2.5 pb-2.5">
      <div className="flex min-h-8 items-center gap-2.5">
        <UserButton appearance={userButtonAppearance} />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <p className="truncate text-xs font-medium leading-tight text-sidebar-foreground">{name}</p>
          {email ? (
            <p className="truncate text-[11px] leading-tight text-muted-foreground">{email}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
