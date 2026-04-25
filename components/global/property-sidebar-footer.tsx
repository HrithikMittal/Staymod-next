"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const currentTheme = theme === "light" || theme === "dark" || theme === "system" ? theme : "system";

  if (!isLoaded || !user) {
    return null;
  }

  const name = displayName(user);
  const email = primaryEmail(user);

  return (
    <div
      className={cn(
        "shrink-0 pt-1 pb-2.5",
        collapsed ? "px-2" : "pr-2 pl-3",
      )}
    >
      {/* Theme toggle — only render after mount so resolvedTheme is known */}
      {mounted && (
        <div className={cn("mb-2", collapsed ? "flex justify-center" : "")}>
          {collapsed ? (
            <button
              type="button"
              onClick={() => setTheme("system")}
              aria-label="Theme: system mode"
              className="flex size-8 items-center justify-center rounded-md text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              title="Theme: system"
            >
              <LaptopIcon className="size-3.5" aria-hidden />
            </button>
          ) : (
            <div className="grid h-7 w-full grid-cols-3 rounded-md border border-sidebar-border/80 bg-sidebar-accent/50 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "inline-flex items-center justify-center gap-1 rounded-sm font-medium transition-colors",
                  currentTheme === "light"
                    ? "bg-sidebar text-sidebar-foreground shadow-sm"
                    : "text-muted-foreground hover:text-sidebar-foreground",
                )}
              >
                <SunIcon className="size-3" aria-hidden />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "inline-flex items-center justify-center gap-1 rounded-sm font-medium transition-colors",
                  currentTheme === "dark"
                    ? "bg-sidebar text-sidebar-foreground shadow-sm"
                    : "text-muted-foreground hover:text-sidebar-foreground",
                )}
              >
                <MoonIcon className="size-3" aria-hidden />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={cn(
                  "inline-flex items-center justify-center gap-1 rounded-sm font-medium transition-colors",
                  currentTheme === "system"
                    ? "bg-sidebar text-sidebar-foreground shadow-sm"
                    : "text-muted-foreground hover:text-sidebar-foreground",
                )}
              >
                <LaptopIcon className="size-3" aria-hidden />
                <span>System</span>
              </button>
            </div>
          )}
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
