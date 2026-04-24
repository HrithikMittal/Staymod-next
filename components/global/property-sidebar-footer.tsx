"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

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

type PropertySidebarFooterProps = {
  collapsed?: boolean;
};

export function PropertySidebarFooter({ collapsed = false }: PropertySidebarFooterProps) {
  const { user, isLoaded } = useUser();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  if (!isLoaded || !user) {
    return null;
  }

  const name = displayName(user);
  const email = primaryEmail(user);

  return (
    <div
      className={cn(
        "shrink-0 border-sidebar-border border-t pt-2.5 pb-2.5",
        collapsed ? "px-2" : "pr-2 pl-3",
      )}
    >
      {/* Theme toggle — only render after mount so resolvedTheme is known */}
      {mounted && (
        <div className={cn("mb-2", collapsed ? "flex justify-center" : "")}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={cn(
              "flex items-center gap-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed ? "size-8 justify-center p-0" : "h-7 w-full px-2",
            )}
          >
            {isDark ? (
              <SunIcon className="size-3.5" aria-hidden />
            ) : (
              <MoonIcon className="size-3.5" aria-hidden />
            )}
            {!collapsed && (
              <span>{isDark ? "Light mode" : "Dark mode"}</span>
            )}
          </button>
        </div>
      )}

      {/* User */}
      <div
        className={cn(
          "flex min-h-8 items-center gap-2.5",
          collapsed && "justify-center",
        )}
      >
        <UserButton appearance={userButtonAppearance} />
        {!collapsed ? (
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
            <p className="truncate text-xs font-medium leading-tight text-sidebar-foreground">{name}</p>
            {email ? (
              <p className="truncate text-[11px] leading-tight text-muted-foreground">{email}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
