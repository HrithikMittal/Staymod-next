"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CodeSampleProps = {
  title?: string;
  code: string;
  className?: string;
};

export function CodeSample({ title, code, className }: CodeSampleProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border/80 bg-muted/40", className)}>
      {title ? (
        <div className="border-b border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground">
          {title}
        </div>
      ) : null}
      <div className="relative">
        <pre className="max-h-[min(70vh,28rem)] overflow-auto p-3 pr-14 text-left text-xs leading-relaxed [scrollbar-gutter:stable]">
          <code className="font-mono text-foreground/95">{code}</code>
        </pre>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute right-2 top-2 size-8"
          onClick={copy}
          aria-label="Copy code"
        >
          {copied ? <CheckIcon className="size-3.5 text-emerald-600" /> : <CopyIcon className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}
