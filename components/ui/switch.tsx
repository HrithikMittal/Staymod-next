"use client";

import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  "aria-labelledby"?: string;
};

export function Switch({
  checked,
  onCheckedChange,
  id,
  disabled,
  className,
  "aria-labelledby": ariaLabelledBy,
}: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent px-0.5 transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "justify-end bg-primary" : "justify-start bg-muted",
        className,
      )}
    >
      <span className="pointer-events-none block size-5 rounded-full bg-background shadow-sm" />
    </button>
  );
}
